import { useState, useCallback, useEffect, useRef } from 'react';
import { DSLUpdater } from '@/utils/dsl-updater';
import { MWPUpdater } from '@/utils/mwp-updater';
import { toast } from 'sonner';

interface EditableComponentsProps {
  initialDSL: string;
  initialMWP: string;
  componentMappings: Record<string, any>;
  onUpdate: (dsl: string, mwp: string) => void;
}

export const useEditableComponents = ({
  initialDSL,
  initialMWP,
  componentMappings,
  onUpdate,
}: EditableComponentsProps) => {
  const [dslValue, setDslValue] = useState(initialDSL);
  const [mwpValue, setMwpValue] = useState(initialMWP);
  const [entityMappings, setEntityMappings] = useState<any[]>([]);
  const [editingComponent, setEditingComponent] = useState<string | null>(null);
  const [editPosition, setEditPosition] = useState({ x: 0, y: 0 });
  const [componentProperties, setComponentProperties] = useState<Record<string, any> | null>(null);
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Update values when props change
  useEffect(() => {
    setDslValue(initialDSL);
  }, [initialDSL]);
  
  useEffect(() => {
    setMwpValue(initialMWP);
  }, [initialMWP]);
  
  // Extract entity mappings when MWP or mappings change
  useEffect(() => {
    if (mwpValue && componentMappings && Object.keys(componentMappings).length > 0) {
      const mappings = MWPUpdater.extractEntityMappings(mwpValue, componentMappings);
      setEntityMappings(mappings);
    }
  }, [mwpValue, componentMappings]);
  
  const handleComponentUpdate = useCallback((
    dslPath: string,
    updates: Record<string, any>
  ) => {
    try {
      // Get component data from mappings
      const componentData = componentMappings[dslPath];
      if (!componentData) {
        throw new Error('Component data not found');
      }
      
      const componentPath = dslPath;
      
      // Update DSL
      const updatedDSL = DSLUpdater.updateComponentInDSL(
        dslValue,
        dslPath,
        componentPath,
        updates
      );
      
      // Validate DSL
      const validation = DSLUpdater.validateDSL(updatedDSL);
      if (!validation.valid) {
        throw new Error(`DSL validation failed: ${validation.error}`);
      }
      
      // Update MWP
      const updatedMWP = MWPUpdater.updateMWPText(
        mwpValue,
        dslPath,
        updates,
        entityMappings,
        componentMappings
      );
      
      // Update local state immediately
      setDslValue(updatedDSL);
      setMwpValue(updatedMWP);
      
      // Update component mappings with new values
      const updatedMappings = { ...componentMappings };
      if (updatedMappings[dslPath]) {
        // Deep merge the updates
        if (updates.item) {
          updatedMappings[dslPath].properties.item = {
            ...updatedMappings[dslPath].properties.item,
            ...updates.item
          };
        }
        Object.entries(updates).forEach(([key, value]) => {
          if (key !== 'item') {
            updatedMappings[dslPath].properties[key] = value;
          }
        });
      }
      
      // Debounce the regeneration to avoid too many API calls
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
      
      updateTimeoutRef.current = setTimeout(() => {
        onUpdate(updatedDSL, updatedMWP);
        toast.success('Component updated successfully');
      }, 1000); // Wait 1 second before triggering regeneration
      
    } catch (error) {
      console.error('Failed to update component:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update component');
    }
  }, [dslValue, mwpValue, entityMappings, componentMappings, onUpdate]);
  
  const openEditPanel = useCallback((
    dslPath: string,
    clickPosition: { x: number; y: number }
  ) => {
    const componentData = componentMappings[dslPath];
    if (componentData) {
      setEditingComponent(dslPath);
      setComponentProperties(componentData.properties);
      setEditPosition(clickPosition);
    }
  }, [componentMappings]);
  
  const closeEditPanel = useCallback(() => {
    setEditingComponent(null);
    setComponentProperties(null);
  }, []);
  
  // Listen for edit panel events
  useEffect(() => {
    const handleShowEditPanel = (event: CustomEvent) => {
      const { dslPath, position } = event.detail;
      openEditPanel(dslPath, position);
    };
    
    window.addEventListener('show-edit-panel', handleShowEditPanel as EventListener);
    
    return () => {
      window.removeEventListener('show-edit-panel', handleShowEditPanel as EventListener);
    };
  }, [openEditPanel]);
  
  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, []);
  
  // Get highlighted ranges for DSL - now using backend-provided ranges
  const getDSLHighlightRanges = useCallback((hoveredDslPath: string | null): Array<[number, number]> => {
    if (!hoveredDslPath || !componentMappings[hoveredDslPath]) {
      return [];
    }
    
    const componentData = componentMappings[hoveredDslPath];
    const range = componentData.dsl_range;
    
    if (range && range.length === 2) {
      return [range];
    }
    
    return [];
  }, [componentMappings]);
  
  // Get highlighted ranges for MWP
  const getMWPHighlightRanges = useCallback((hoveredDslPath: string | null): Array<[number, number]> => {
    if (!hoveredDslPath) {
      return [];
    }
    
    const relevantMappings = entityMappings.filter(m => m.componentId === hoveredDslPath);
    return relevantMappings.map(m => [m.startPos, m.endPos]);
  }, [entityMappings]);
  
  return {
    dslValue,
    mwpValue,
    editingComponent,
    editPosition,
    componentProperties,
    handleComponentUpdate,
    openEditPanel,
    closeEditPanel,
    getDSLHighlightRanges,
    getMWPHighlightRanges,
    entityMappings,
  };
};
