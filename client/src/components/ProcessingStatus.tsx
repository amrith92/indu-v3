import { useEffect } from 'react';
import { useDocumentStore } from '@/hooks/useDocumentStore';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

interface ProcessingStatusProps {
  onClose: () => void;
}

export default function ProcessingStatus({ onClose }: ProcessingStatusProps) {
  const { processingStatus } = useDocumentStore();
  
  // Handle completion with a slight delay for better UX
  useEffect(() => {
    if (processingStatus.overall === 100) {
      const timer = setTimeout(() => {
        onClose();
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [processingStatus.overall, onClose]);
  
  return (
    <div className="fixed bottom-0 right-0 m-4 bg-white rounded-lg shadow-lg max-w-xs w-full overflow-hidden z-50">
      <div className="p-3 bg-primary-600 text-white flex justify-between items-center">
        <div className="flex items-center">
          <span className="material-icons mr-2">hourglass_top</span>
          <span className="font-medium">Processing Documents</span>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onClose}
          className="p-1 rounded-full hover:bg-primary-500 h-auto text-white"
        >
          <span className="material-icons text-sm">close</span>
        </Button>
      </div>
      <div className="p-4">
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-1">
            <span>Overall Progress</span>
            <span>{processingStatus.overall}%</span>
          </div>
          <Progress value={processingStatus.overall} className="h-2 bg-neutral-200" />
        </div>
        
        <div className="space-y-3">
          {processingStatus.files.map(file => (
            <div key={file.id}>
              <div className="flex justify-between text-xs mb-1">
                <span className="truncate flex-1 font-medium">{file.name}</span>
                <span>{file.progress}%</span>
              </div>
              <Progress 
                value={file.progress} 
                className="h-1.5 bg-neutral-200" 
                indicatorClassName={file.progress === 100 ? "bg-green-500" : undefined}
              />
            </div>
          ))}
        </div>
      </div>
      <div className="px-4 pb-3 text-xs text-neutral-500">
        <p>This processing happens entirely in your browser. No data is sent to any server.</p>
      </div>
    </div>
  );
}
