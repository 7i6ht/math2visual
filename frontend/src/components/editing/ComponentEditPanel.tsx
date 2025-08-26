import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { X, Check } from 'lucide-react';

interface ComponentEditPanelProps {
  dslPath: string;
  properties: Record<string, any>;
  position: { x: number; y: number };
  onUpdate: (dslPath: string, updates: Record<string, any>) => void;
  onClose: () => void;
}

export const ComponentEditPanel = ({
  dslPath,
  properties,
  position,
  onUpdate,
  onClose,
}: ComponentEditPanelProps) => {
  const [editedValues, setEditedValues] = useState<Record<string, any>>({});
  
  // Extract the item properties if they exist
  const itemProps = properties?.item || {};
  const containerProps = {
    container_name: properties?.container_name,
    container_type: properties?.container_type,
    attr_name: properties?.attr_name,
    attr_type: properties?.attr_type,
  };
  
  // Combine all properties for editing
  const allProps = { ...itemProps, ...containerProps };
  
  // Initialize edited values
  useEffect(() => {
    const initialValues: Record<string, any> = {};
    Object.entries(allProps).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        initialValues[key] = value;
      }
    });
    setEditedValues(initialValues);
  }, [dslPath]);
  
  // Define which fields are editable
  const editableFields = [
    { key: 'entity_quantity', label: 'Quantity', type: 'number' },
    { key: 'entity_name', label: 'Entity Name', type: 'text' },
    { key: 'entity_type', label: 'Entity Type', type: 'text' },
    { key: 'container_name', label: 'Container Name', type: 'text' },
    { key: 'container_type', label: 'Container Type', type: 'text' },
    { key: 'attr_name', label: 'Attribute Name', type: 'text' },
    { key: 'attr_type', label: 'Attribute Type', type: 'text' },
  ];
  
  const handleSubmit = () => {
    const changes: Record<string, any> = {};
    
    // Find what has changed
    Object.keys(editedValues).forEach(key => {
      const originalValue = allProps[key];
      const newValue = editedValues[key];
      
      if (newValue !== originalValue) {
        // If it's an item property, nest it properly
        if (['entity_quantity', 'entity_name', 'entity_type'].includes(key)) {
          if (!changes.item) changes.item = {};
          changes.item[key] = newValue;
        } else {
          changes[key] = newValue;
        }
      }
    });
    
    if (Object.keys(changes).length > 0) {
      onUpdate(dslPath, changes);
    }
    onClose();
  };
  
  const handleFieldChange = (key: string, value: string) => {
    setEditedValues(prev => ({
      ...prev,
      [key]: value
    }));
  };
  
  // Calculate panel position to keep it on screen
  const adjustedPosition = {
    x: Math.min(position.x, window.innerWidth - 320),
    y: Math.min(position.y, window.innerHeight - 400)
  };
  
  return (
    <Card 
      className="absolute z-50 p-4 shadow-lg w-[300px] bg-white dark:bg-gray-800 border-2 border-blue-500"
      style={{ 
        left: `${adjustedPosition.x}px`, 
        top: `${adjustedPosition.y}px`,
        maxHeight: '400px',
        overflowY: 'auto'
      }}
    >
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold text-lg">Edit Component</h3>
        <Button 
          variant="ghost" 
          size="icon"
          onClick={onClose}
          className="h-8 w-8"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="space-y-3">
        {editableFields.map(field => {
          const value = editedValues[field.key];
          if (value === undefined || value === null || value === '') {
            return null; // Don't show empty fields
          }
          
          return (
            <div key={field.key} className="space-y-1">
              <Label htmlFor={field.key} className="text-sm font-medium">
                {field.label}
              </Label>
              <Input
                id={field.key}
                type={field.type}
                value={value || ''}
                onChange={(e) => handleFieldChange(field.key, e.target.value)}
                className="h-9"
              />
            </div>
          );
        })}
      </div>
      
      <div className="flex gap-2 mt-4 pt-4 border-t">
        <Button 
          size="sm" 
          onClick={handleSubmit}
          className="flex-1"
        >
          <Check className="h-4 w-4 mr-1" />
          Apply
        </Button>
        <Button 
          size="sm" 
          variant="outline"
          onClick={onClose}
          className="flex-1"
        >
          Cancel
        </Button>
      </div>
    </Card>
  );
};
