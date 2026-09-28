import { FieldValues } from 'react-hook-form';
import { CloudUploadOutlined, DeleteOutlined, FileTextOutlined } from '@ant-design/icons';
import { App, Flex, Spin, Typography, Upload } from 'antd';
import { UploadChangeParam, UploadFile } from 'antd/es/upload';

import { CustomUploadFile, FileFieldProps } from '../types';
import FormItem from './FormItem';

import environment from '@/config/environment';
import {
  COLOR_BORDER_STRONG,
  COLOR_INFO,
  COLOR_TEXT_PRIMARY,
  COLOR_TEXT_SECONDARY,
} from '@/constant/color';
import { useDeleteFile, useUploadFile } from '@/hooks/common';
import { getFileType } from '@/lib';

const { Title, Text } = Typography;

const FileField = <TFieldValues extends FieldValues = FieldValues>({
  name,
  label,
  isRequired,
  direction,
  labelMinWidth,
  labelPosition,
  styleLabel,
  showLabel,
  disabled,
  instruction,
  questionMark,
  accept,
  maxSize,
  maxCount = 1,
  supported,
  onUploading,
  onDelete,
  onValidate,
  onChange: customChange,
  ...props
}: FileFieldProps<TFieldValues>) => {
  const { message } = App.useApp();

  const { mutateAsync: uploadAsync, isPending: isUploading } = useUploadFile();
  const { mutateAsync: deleteAsync, isPending: isDeleting } = useDeleteFile();

  const onUploadChange = (info: UploadChangeParam<UploadFile<unknown>>) => {
    const { status } = info.file;
    if (status !== 'uploading') {
      //   console.log(info.file, info.fileList);
    }
    if (status === 'done') {
      message.success(`${info.file.name} ${'uploaded.'}`);
    } else if (status === 'error') {
      message.error(`${info.file.name} ${'upload failed.'}`);
    }

    customChange?.(info);
  };

  return (
    <FormItem
      name={name}
      label={label}
      isRequired={isRequired}
      direction={direction}
      labelMinWidth={labelMinWidth}
      labelPosition={labelPosition}
      styleLabel={styleLabel}
      showLabel={showLabel}
      instruction={instruction}
      disabled={disabled}
      questionMark={questionMark}
      render={({ field: { onChange, value } }) => {
        const _value = value || [];
        let fileList: CustomUploadFile[] = [];
        if (Array.isArray(_value) && _value.length > 0) {
          fileList = _value.map<CustomUploadFile>((i) => {
            const url = new URL(i);
            const size = url.searchParams.get('size');
            const uploadDate = new Date(url.searchParams.get('uploadDate') ?? new Date());
            const lastModifiedDate = new Date(
              url.searchParams.get('lastModifiedDate') ?? new Date(),
            );
            return {
              name: url.searchParams.get('name') ?? '',
              uid: url.searchParams.get('uid') ?? '',
              status: 'done',
              size: size ? +(Math.round((+size / 1000) * 100) / 100).toFixed(2) : 0,
              lastModifiedDate,
              uploadDate,
              link: i,
            };
          });
        }

        const _fileListRender = fileList.filter((f) => f.status !== 'error');

        return (
          <>
            {_fileListRender.length > 0 && (
              <Flex
                vertical
                gap={8}
                style={{
                  marginBottom: 16,
                }}
              >
                {_fileListRender.map((file) => (
                  <Spin spinning={isDeleting} key={file.uid}>
                    <Flex
                      justify="space-between"
                      gap={24}
                      style={{
                        width: '100%',
                        padding: 8,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderStyle: 'solid',
                        borderColor: COLOR_BORDER_STRONG,
                      }}
                    >
                      <Flex align="center" gap={8}>
                        <FileTextOutlined
                          style={{
                            width: '13.3px',
                            height: '16px',
                            color: COLOR_TEXT_SECONDARY,
                          }}
                        />
                        <Text>{file.name}</Text>
                      </Flex>
                      <DeleteOutlined
                        style={{
                          width: 16.7,
                          height: 20,
                          color: COLOR_TEXT_PRIMARY,
                        }}
                        onClick={async () => {
                          try {
                            await deleteAsync(file.name);
                          } catch (error) {
                            message.error('Cannot delete file');
                            console.error(error);
                            return;
                          }
                          if (maxCount === 1) {
                            onChange([]);
                            onDelete?.([]);
                          } else if (Array.isArray(_value)) {
                            const remain = _value.filter((i) => i !== file.link);
                            onChange(remain);
                            onDelete?.(remain);
                          }
                        }}
                      />
                    </Flex>
                  </Spin>
                ))}
              </Flex>
            )}
            <Upload.Dragger
              accept={accept}
              onChange={onUploadChange}
              beforeUpload={async (file) => {
                const fileType = getFileType(file?.name || '');
                const acceptList =
                  typeof accept === 'string' ? accept.replaceAll('.', '').split(',') : [];
                if (acceptList.length > 0 && !acceptList.includes(fileType)) {
                  message.error('This file type isn’t accepted.');
                  return false;
                }
                if (maxSize && file.size / 1000 > maxSize) {
                  message.error(`The file is larger than ${maxSize} KB.`);
                  return false;
                }
                if (maxCount && Array.isArray(_value) && _value.length >= maxCount) {
                  message.error(`At most ${maxCount} file(s).`);
                  return false;
                }

                // Custom validation
                if (onValidate) {
                  try {
                    const validationResult = await onValidate(file);
                    if (validationResult === false) {
                      return false;
                    }
                    if (typeof validationResult === 'string') {
                      message.error(validationResult);
                      return false;
                    }
                  } catch (error) {
                    message.error(error instanceof Error ? error.message : 'Validation failed');
                    return false;
                  }
                }

                try {
                  onUploading?.('start');
                  const formData = new FormData();
                  formData.append('file', file);
                  const resultUpload = await uploadAsync(formData);
                  const path = `${environment.STORAGE_URL}/${resultUpload.data}`;

                  const uploadFile: CustomUploadFile = {
                    name: path.split('/').pop() ?? '',
                    uid: file.uid,
                    type: file.type,
                    size: file.size,
                    lastModifiedDate: file.lastModifiedDate,
                    uploadDate: new Date(),
                  };
                  const searchParams = new URLSearchParams(uploadFile);

                  const link = path + `?${searchParams.toString()}`;
                  onUploading?.('success');
                  onChange([..._value, link]);
                  return false;
                } catch (error) {
                  onUploading?.('error');
                  message.error(`${file.name} ${'upload failed.'}`);
                  console.error(error);
                  return false;
                }
              }}
              fileList={fileList}
              showUploadList={false}
              disabled={disabled}
              {...props}
            >
              <Spin spinning={isUploading}>
                <Flex vertical align="center" justify="center" gap={16}>
                  <CloudUploadOutlined style={{ fontSize: 75 }} />
                  <Title level={3} style={{ margin: 0 }}>
                    {maxCount && maxCount > 1 ? 'Drop files here' : 'Drop a file here'}
                  </Title>
                  {supported && (
                    <Text>
                      {'Supported formats: '}
                      {supported}
                    </Text>
                  )}
                  <Text>{'or'}</Text>
                  <Text underline style={{ color: COLOR_INFO }}>
                    {'Browse file'}
                  </Text>
                </Flex>
              </Spin>
            </Upload.Dragger>
          </>
        );
      }}
    />
  );
};

export default FileField;
