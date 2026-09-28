import { Card, Typography } from 'antd';

const { Title, Paragraph } = Typography;

export interface PlaceholderPageProps {
    title: string;
    description?: string;
}

export default function PlaceholderPage({ title, description }: PlaceholderPageProps) {
    return (
        <div className="p-6">
            <Card>
                <Title level={4}>{title}</Title>
                {description !== undefined ? (
                    <Paragraph type="secondary">{description}</Paragraph>
                ) : null}
            </Card>
        </div>
    );
}
