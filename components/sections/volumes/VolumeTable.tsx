
import React from 'react';

// This component is no longer in use as of the Volume Manager redesign.
// The logic has been integrated into VolumeManagerPanel.tsx and VolumeDetail.tsx
// It is kept here to avoid breaking imports if it were referenced elsewhere,
// but it can be safely removed in a future cleanup.

const VolumeTable: React.FC = () => {
  return (
    <div className="p-4 text-center text-slate-500">
      This component is deprecated. Volume list and details are now managed in the VolumeManagerPanel.
    </div>
  );
};

export default VolumeTable;
