// Drag and drop debug logging utility
// To enable: localStorage.setItem('debug:drag', 'true')

export const dragDebug = {
  isEnabled: (): boolean => {
    if (typeof window === 'undefined') {return false;}
    return localStorage.getItem('debug:drag') === 'true';
  },

  log: (event: string, data?: any): void => {
    if (!dragDebug.isEnabled()) {return;}

    const timestamp = new Date().toISOString().split('T')[1].slice(0, -1);
    console.log(
      `%c[DRAG ${timestamp}] ${event}`,
      'color: #10b981; font-weight: bold',
      data || ''
    );
  },

  logDragStart: (itemId: string, position?: number): void => {
    dragDebug.log('DRAG_START', { itemId, position });
  },

  logDragEnd: (activeId: string, overId: string | null, newOrder?: number): void => {
    dragDebug.log('DRAG_END', {
      from: activeId,
      to: overId,
      newSortOrder: newOrder
    });
  },

  logReorder: (itemId: string, oldIndex: number, newIndex: number, sortOrder: number): void => {
    dragDebug.log('REORDER', {
      itemId,
      oldIndex,
      newIndex,
      sortOrder
    });
  },

  logTransition: (itemId: string, hasTransition: boolean): void => {
    dragDebug.log('TRANSITION', {
      itemId,
      hasTransition,
      status: hasTransition ? 'animating' : 'immediate'
    });
  },

  enable: (): void => {
    if (typeof window === 'undefined') {return;}
    localStorage.setItem('debug:drag', 'true');
    console.log('%c[DRAG DEBUG] Enabled', 'color: #10b981; font-weight: bold');
  },

  disable: (): void => {
    if (typeof window === 'undefined') {return;}
    localStorage.removeItem('debug:drag');
    console.log('%c[DRAG DEBUG] Disabled', 'color: #ef4444; font-weight: bold');
  }
};

// Export convenience functions for console usage
if (typeof window !== 'undefined') {
  (window as any).enableDragDebug = dragDebug.enable;
  (window as any).disableDragDebug = dragDebug.disable;
}