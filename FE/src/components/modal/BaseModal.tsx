import React from 'react';
import { Modal, ModalProps } from 'antd';

type BaseModalProps = Omit<ModalProps, 'centered' | 'mask' | 'footer' | 'destroyOnHidden'> & {
  children: React.ReactNode;
};

const BaseModal: React.FC<BaseModalProps> = ({ children, className = '', ...props }) => {
  return (
    <Modal
      centered
      destroyOnHidden
      mask={{ closable: false }}
      className={`custom-modal ${className}`}
      footer={null}
      {...props}
    >
      {children}
    </Modal>
  );
};

export default BaseModal;
