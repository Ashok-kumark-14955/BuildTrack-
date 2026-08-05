import { useState } from 'react';
import { useApp } from '../AppContext';
import { DrawingsAPI } from '../api';
import DrawingCanvas from '../components/DrawingCanvas';
import TaskPanel from '../components/TaskPanel';
import TopToolbar from '../components/TopToolbar';
import Legend from '../components/Legend';

export default function DrawingPage() {
  const { currentDrawing, selectedElementId, refreshDrawings } = useApp();
  const [showGrid, setShowGrid] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [calibrating, setCalibrating] = useState(false);

  const handleGridSizeChange = async (cols: number, rows: number) => {
    if (!currentDrawing) return;
    await DrawingsAPI.update(currentDrawing.id, { gridCols: cols, gridRows: rows });
    await refreshDrawings();
  };

  return (
    <div className="flex flex-col h-full">
      {!fullscreen && (
        <TopToolbar
          showGrid={showGrid}
          setShowGrid={setShowGrid}
          fullscreen={fullscreen}
          setFullscreen={setFullscreen}
          calibrating={calibrating}
          setCalibrating={setCalibrating}
          gridCols={currentDrawing?.gridCols || 10}
          gridRows={currentDrawing?.gridRows || 8}
          onGridSizeChange={handleGridSizeChange}
        />
      )}
      <div className="flex-1 flex overflow-hidden relative">
        <div className="flex-1 min-w-0 relative">
          <DrawingCanvas showGrid={showGrid} fullscreen={fullscreen} calibrating={calibrating} />
          {!fullscreen && <Legend />}
          {fullscreen && (
            <button
              onClick={() => setFullscreen(false)}
              className="absolute top-4 right-4 z-[70] shadow px-3 py-2 rounded-lg text-sm font-semibold text-rose-100 border border-rose-900/50"
              style={{ background: 'rgba(20,4,8,0.9)', backdropFilter: 'blur(8px)' }}
            >
              Exit Fullscreen
            </button>
          )}
        </div>
        {selectedElementId && !fullscreen && (
          <div className="w-96 shrink-0">
            <TaskPanel />
          </div>
        )}
        {selectedElementId && fullscreen && (
          <div className="absolute top-0 right-0 h-full w-96 z-[60] shadow-2xl">
            <TaskPanel />
          </div>
        )}
      </div>
    </div>
  );
}
