import { useNavigate } from 'react-router-dom';
import { Button, Result } from 'antd';

export default function ForbiddenPage() {
    const navigate = useNavigate();
    return (
        <div className="min-h-screen flex items-center justify-center bg-canvas">
            <Result
                status="403"
                title="403"
                subTitle="You don't have access to this area."
                extra={
                    <Button type="primary" onClick={() => navigate('/')}>
                        Back to home
                    </Button>
                }
            />
        </div>
    );
}
