import React, { useRef, useEffect, useCallback, useState } from 'react';

function App() {
    const canvasRef = useRef(null);
    const isDrawingRef = useRef(false);
    const [activeTool, setActiveTool] = useState('Draw');
    const [drawnObjects, setDrawnObjects] = useState([]);
    const [selectedShape, setSelectedShape] = useState('Square');
    const [showShapeBubble, setShowShapeBubble] = useState(false);
    const shapesButtonRef = useRef(null);
    const [shapeBubblePos, setShapeBubblePos] = useState({ top: 0, left: 0 });
    const [placingShape, setPlacingShape] = useState(null);
    const [placingText, setPlacingText] = useState(null);
    const [textInput, setTextInput] = useState('');
    const [showTextInput, setShowTextInput] = useState(false);
    const [textInputPos, setTextInputPos] = useState({ top: 0, left: 0, width: 0, height: 0 });
    const [fontSize, setFontSize] = useState(16);
    const [selectedObjectIndices, setSelectedObjectIndices] = useState([]);
    const [showFontSizeInput, setShowFontSizeInput] = useState(false);
    const [fontSizeInputPos, setFontSizeInputPos] = useState({ top: 0, left: 0 });
    const dragOffset = useRef({ x: 0, y: 0 });
    const currentStroke = useRef([]);
    const [ctrlPressed, setCtrlPressed] = useState(false);

    // Color palette state
    const [selectedColor, setSelectedColor] = useState('#222'); // Default: Black
    const colorPalette = [
        { name: 'Black', value: '#222' },
        { name: 'Red', value: '#e53935' },
        { name: 'Blue', value: '#1976d2' },
        { name: 'Green', value: '#43a047' },
        { name: 'Yellow', value: '#fbc02d' },
        { name: 'Purple', value: '#8e24aa' },
        { name: 'Pink', value: '#d81b60' },
        { name: 'Grey', value: '#757575' }
    ];

    // Thickness state
    const [thickness, setThickness] = useState(5);

    // Redraw all objects and current stroke if drawing or placing shape/text
    const redrawObjects = useCallback(() => {
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        context.clearRect(0, 0, context.canvas.width, context.canvas.height);
        context.fillStyle = 'white';
        context.fillRect(0, 0, context.canvas.width, context.canvas.height);

        drawnObjects.forEach((obj, idx) => {
            context.save();
            const isSelected = selectedObjectIndices.includes(idx);
            let color = '#222';
            let lineWidth = thickness;
            if (obj.type === 'draw' || obj.type === 'rect' || obj.type === 'circle' || obj.type === 'triangle' || obj.type === 'line') {
                color = obj.color || selectedColor;
                lineWidth = obj.thickness || thickness;
            }
            if (obj.type === 'rect') {
                context.strokeStyle = isSelected ? '#1976d2' : color;
                context.lineWidth = lineWidth;
                context.strokeRect(obj.x, obj.y, obj.width, obj.height);
            }
            if (obj.type === 'circle') {
                context.strokeStyle = isSelected ? '#1976d2' : color;
                context.lineWidth = lineWidth;
                context.beginPath();
                context.arc(obj.x, obj.y, obj.radius, 0, 2 * Math.PI);
                context.stroke();
            }
            if (obj.type === 'triangle') {
                context.strokeStyle = isSelected ? '#1976d2' : color;
                context.lineWidth = lineWidth;
                context.beginPath();
                context.moveTo(obj.x, obj.y - obj.size);
                context.lineTo(obj.x - obj.size, obj.y + obj.size);
                context.lineTo(obj.x + obj.size, obj.y + obj.size);
                context.closePath();
                context.stroke();
            }
            if (obj.type === 'line') {
                context.strokeStyle = isSelected ? '#1976d2' : color;
                context.lineWidth = lineWidth;
                context.beginPath();
                context.moveTo(obj.x1, obj.y1);
                context.lineTo(obj.x2, obj.y2);
                context.stroke();
            }
            if (obj.type === 'draw') {
                context.strokeStyle = color;
                context.lineWidth = lineWidth;
                context.beginPath();
                obj.points.forEach((pt, i) => {
                    if (i === 0) {
                        context.moveTo(pt.x, pt.y);
                    } else {
                        context.lineTo(pt.x, pt.y);
                    }
                });
                context.stroke();
            }
            if (obj.type === 'text') {
                context.strokeStyle = isSelected ? '#1976d2' : '#222';
                context.lineWidth = 2;
                context.strokeRect(obj.x, obj.y, obj.width, obj.height);
                context.font = `${obj.fontSize || 16}px Arial`;
                context.fillStyle = '#222';
                context.textBaseline = 'top';
                const words = obj.text.split(' ');
                let line = '';
                let y = obj.y + 4;
                const lineHeight = (obj.fontSize || 16) + 4;
                for (let n = 0; n < words.length; n++) {
                    const testLine = line + words[n] + ' ';
                    const metrics = context.measureText(testLine);
                    const testWidth = metrics.width;
                    if (testWidth > obj.width - 8 && n > 0) {
                        context.fillText(line, obj.x + 4, y);
                        line = words[n] + ' ';
                        y += lineHeight;
                    } else {
                        line = testLine;
                    }
                }
                context.fillText(line, obj.x + 4, y);
            }
            context.restore();
        });

        // Draw current stroke in progress
        if (isDrawingRef.current && currentStroke.current.length > 0) {
            context.save();
            context.strokeStyle = selectedColor;
            context.lineWidth = thickness;
            context.beginPath();
            currentStroke.current.forEach((pt, i) => {
                if (i === 0) {
                    context.moveTo(pt.x, pt.y);
                } else {
                    context.lineTo(pt.x, pt.y);
                }
            });
            context.stroke();
            context.restore();
        }

        // Draw shape being placed
        if (placingShape) {
            context.save();
            context.strokeStyle = selectedColor;
            context.lineWidth = thickness;
            const { type, anchor, current } = placingShape;
            if (type === 'rect') {
                const width = current.x - anchor.x;
                const height = current.y - anchor.y;
                context.strokeRect(anchor.x, anchor.y, width, height);
            } else if (type === 'circle') {
                const radius = Math.hypot(current.x - anchor.x, current.y - anchor.y);
                context.beginPath();
                context.arc(anchor.x, anchor.y, radius, 0, 2 * Math.PI);
                context.stroke();
            } else if (type === 'triangle') {
                const size = Math.max(Math.abs(current.x - anchor.x), Math.abs(current.y - anchor.y));
                context.beginPath();
                context.moveTo(anchor.x, anchor.y - size);
                context.lineTo(anchor.x - size, anchor.y + size);
                context.lineTo(anchor.x + size, anchor.y + size);
                context.closePath();
                context.stroke();
            } else if (type === 'line') {
                context.beginPath();
                context.moveTo(anchor.x, anchor.y);
                context.lineTo(current.x, current.y);
                context.stroke();
            }
            context.restore();
        }

        // Draw text box being placed
        if (placingText) {
            context.save();
            context.strokeStyle = '#1976d2';
            context.lineWidth = 2;
            const { anchor, current } = placingText;
            const width = current.x - anchor.x;
            const height = current.y - anchor.y;
            context.strokeRect(anchor.x, anchor.y, width, height);
            context.restore();
        }
    }, [drawnObjects, placingShape, placingText, selectedObjectIndices, selectedColor, thickness]);

    // White canvas that fills window
    const resizeCanvas = useCallback(() => {
        const canvas = canvasRef.current;
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        redrawObjects();
    }, [redrawObjects]);

    // Drawing handlers
    const getCoordinates = (e) => {
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        if (e.touches) {
            return {
                x: e.touches[0].clientX - rect.left,
                y: e.touches[0].clientY - rect.top,
            };
        }
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
        };
    };

    // Draw tool logic
    const startDrawing = useCallback((e) => {
        if (activeTool !== 'Draw') return;
        isDrawingRef.current = true;
        currentStroke.current = [];
        const { x, y } = getCoordinates(e);
        currentStroke.current.push({ x, y });
        redrawObjects();
    }, [activeTool, redrawObjects]);

    const draw = useCallback((e) => {
        if (!isDrawingRef.current || activeTool !== 'Draw') return;
        const { x, y } = getCoordinates(e);
        currentStroke.current.push({ x, y });
        redrawObjects();
    }, [activeTool, redrawObjects]);

    const stopDrawing = useCallback(() => {
        if (!isDrawingRef.current || activeTool !== 'Draw') return;
        isDrawingRef.current = false;
        if (currentStroke.current.length > 1) {
            setDrawnObjects(prev => [
                ...prev,
                { type: 'draw', points: [...currentStroke.current], color: selectedColor, thickness }
            ]);
        }
        currentStroke.current = [];
        redrawObjects();
    }, [activeTool, redrawObjects, selectedColor, thickness]);

    // Shapes tool logic
    const handleShapeMouseDown = useCallback((e) => {
        if (activeTool !== 'Shapes') return;
        const { x, y } = getCoordinates(e);
        setPlacingShape({
            type: selectedShape === 'Square' ? 'rect' : selectedShape.toLowerCase(),
            anchor: { x, y },
            current: { x, y }
        });
    }, [activeTool, selectedShape]);

    const handleShapeMouseMove = useCallback((e) => {
        if (activeTool !== 'Shapes' || !placingShape) return;
        if (e.buttons !== 1) return;
        const { x, y } = getCoordinates(e);
        setPlacingShape(prev => prev ? { ...prev, current: { x, y } } : null);
    }, [activeTool, placingShape]);

    const handleShapeMouseUp = useCallback((e) => {
        if (activeTool !== 'Shapes' || !placingShape) return;
        const { x, y } = getCoordinates(e);
        const { type, anchor } = placingShape;
        let newShape = null;
        if (type === 'rect') {
            newShape = {
                type: 'rect',
                x: anchor.x,
                y: anchor.y,
                width: x - anchor.x,
                height: y - anchor.y,
                color: selectedColor,
                thickness
            };
        } else if (type === 'circle') {
            newShape = {
                type: 'circle',
                x: anchor.x,
                y: anchor.y,
                radius: Math.hypot(x - anchor.x, y - anchor.y),
                color: selectedColor,
                thickness
            };
        } else if (type === 'triangle') {
            const size = Math.max(Math.abs(x - anchor.x), Math.abs(y - anchor.y));
            newShape = {
                type: 'triangle',
                x: anchor.x,
                y: anchor.y,
                size,
                color: selectedColor,
                thickness
            };
        } else if (type === 'line') {
            newShape = {
                type: 'line',
                x1: anchor.x,
                y1: anchor.y,
                x2: x,
                y2: y,
                color: selectedColor,
                thickness
            };
        }
        if (newShape) {
            setDrawnObjects(prev => [...prev, newShape]);
        }
        setPlacingShape(null);
    }, [activeTool, placingShape, selectedColor, thickness]);

    // Text tool logic
    const handleTextMouseDown = useCallback((e) => {
        if (activeTool !== 'Text') return;
        const { x, y } = getCoordinates(e);
        setPlacingText({
            anchor: { x, y },
            current: { x, y },
            fontSize
        });
    }, [activeTool, fontSize]);

    const handleTextMouseMove = useCallback((e) => {
        if (activeTool !== 'Text' || !placingText) return;
        if (e.buttons !== 1) return;
        const { x, y } = getCoordinates(e);
        setPlacingText(prev => prev ? { ...prev, current: { x, y } } : null);
    }, [activeTool, placingText]);

    const handleTextMouseUp = useCallback((e) => {
        if (activeTool !== 'Text' || !placingText) return;
        const { x, y } = getCoordinates(e);
        const { anchor } = placingText;
        const left = Math.min(anchor.x, x);
        const top = Math.min(anchor.y, y);
        const width = Math.abs(x - anchor.x);
        const height = Math.abs(y - anchor.y);
        setTextInput('');
        setShowTextInput(true);
        setTextInputPos({ top, left, width, height });
        setPlacingText({
            anchor: { x: left, y: top },
            current: { x: left + width, y: top + height },
            fontSize
        });
    }, [activeTool, placingText, fontSize]);

    // Handle text input submit
    const handleTextInputBlur = () => {
        if (!placingText) {
            setShowTextInput(false);
            return;
        }
        const { anchor, current, fontSize } = placingText;
        const x = anchor.x;
        const y = anchor.y;
        const width = Math.abs(current.x - anchor.x);
        const height = Math.abs(current.y - anchor.y);
        if (textInput.trim()) {
            setDrawnObjects(prev => [
                ...prev,
                {
                    type: 'text',
                    x,
                    y,
                    width: width || 80,
                    height: height || 40,
                    text: textInput,
                    fontSize: fontSize || 16
                }
            ]);
        }
        setShowTextInput(false);
        setPlacingText(null);
        setTextInput('');
    };

    // Select tool logic (multi-select with Ctrl)
    const handleSelectMouseDown = useCallback((e) => {
        if (activeTool !== 'Select') return;
        const { x, y } = getCoordinates(e);
        // Rectangle
        const idxRect = drawnObjects.findIndex(obj =>
            obj.type === 'rect' &&
            x >= obj.x && x <= obj.x + obj.width &&
            y >= obj.y && y <= obj.y + obj.height
        );
        // Circle
        const idxCircle = drawnObjects.findIndex(obj =>
            obj.type === 'circle' &&
            Math.hypot(obj.x - x, obj.y - y) <= obj.radius
        );
        // Triangle (simple bounding box for now)
        const idxTriangle = drawnObjects.findIndex(obj =>
            obj.type === 'triangle' &&
            x >= obj.x - obj.size && x <= obj.x + obj.size &&
            y >= obj.y - obj.size && y <= obj.y + obj.size
        );
        // Line (distance to line segment)
        const idxLine = drawnObjects.findIndex(obj =>
            obj.type === 'line' &&
            Math.abs((obj.y2 - obj.y1) * x - (obj.x2 - obj.x1) * y + obj.x2 * obj.y1 - obj.y2 * obj.x1) /
            Math.hypot(obj.x2 - obj.x1, obj.y2 - obj.y1) < 10 &&
            x >= Math.min(obj.x1, obj.x2) - 10 && x <= Math.max(obj.x1, obj.x2) + 10 &&
            y >= Math.min(obj.y1, obj.y2) - 10 && y <= Math.max(obj.y1, obj.y2) + 10
        );
        // Text
        const idxText = drawnObjects.findIndex(obj =>
            obj.type === 'text' &&
            x >= obj.x && x <= obj.x + obj.width &&
            y >= obj.y && y <= obj.y + obj.height
        );
        let idx = idxRect !== -1 ? idxRect : idxCircle !== -1 ? idxCircle : idxTriangle !== -1 ? idxTriangle : idxLine !== -1 ? idxLine : idxText !== -1 ? idxText : -1;
        if (idx !== -1) {
            if (ctrlPressed) {
                setSelectedObjectIndices(prev => prev.includes(idx) ? prev : [...prev, idx]);
            } else {
                setSelectedObjectIndices([idx]);
            }
            const obj = drawnObjects[idx];
            let offset = { x: 0, y: 0 };
            if (obj.type === 'rect' || obj.type === 'circle' || obj.type === 'triangle' || obj.type === 'text') {
                offset = { x: x - obj.x, y: y - obj.y };
            } else if (obj.type === 'line') {
                offset = { x: x - obj.x1, y: y - obj.y1 };
            }
            dragOffset.current = offset;
            // Show font size input for text
            if (obj.type === 'text') {
                setShowFontSizeInput(true);
                setFontSize(obj.fontSize || 16);
                setFontSizeInputPos({ top: obj.y + obj.height + 10, left: obj.x });
            } else {
                setShowFontSizeInput(false);
            }
        } else {
            if (!ctrlPressed) setSelectedObjectIndices([]);
            setShowFontSizeInput(false);
        }
    }, [activeTool, drawnObjects, ctrlPressed]);

    const handleSelectMouseMove = useCallback((e) => {
        if (activeTool !== 'Select' || selectedObjectIndices.length === 0) return;
        if (e.buttons !== 1) return;
        const { x, y } = getCoordinates(e);
        setDrawnObjects(prev => {
            const updated = [...prev];
            // Only move the last selected object for simplicity
            const idx = selectedObjectIndices[selectedObjectIndices.length - 1];
            const obj = updated[idx];
            if (obj.type === 'rect' || obj.type === 'circle' || obj.type === 'triangle' || obj.type === 'text') {
                updated[idx] = {
                    ...obj,
                    x: x - dragOffset.current.x,
                    y: y - dragOffset.current.y
                };
            } else if (obj.type === 'line') {
                const dx = x - dragOffset.current.x - obj.x1;
                const dy = y - dragOffset.current.y - obj.y1;
                updated[idx] = {
                    ...obj,
                    x1: obj.x1 + dx,
                    y1: obj.y1 + dy,
                    x2: obj.x2 + dx,
                    y2: obj.y2 + dy
                };
            }
            return updated;
        });
        // Move font size input bubble if text
        const idx = selectedObjectIndices[selectedObjectIndices.length - 1];
        if (drawnObjects[idx] && drawnObjects[idx].type === 'text') {
            setFontSizeInputPos({
                top: y - dragOffset.current.y + drawnObjects[idx].height + 10,
                left: x - dragOffset.current.x
            });
        }
    }, [activeTool, selectedObjectIndices, drawnObjects]);

    const handleSelectMouseUp = useCallback(() => {
        // Selection persists after mouse up
    }, []);

    // Font size change for text
    const lastSelectedTextIdx = selectedObjectIndices.length > 0
        ? selectedObjectIndices[selectedObjectIndices.length - 1]
        : null;

    const handleFontSizeChange = (e) => {
        let value = Number(e.target.value);
        if (value < 8) value = 8;
        if (value > 48) value = 48;
        setFontSize(value);
        setDrawnObjects(prev => {
            const updated = [...prev];
            if (lastSelectedTextIdx !== null && updated[lastSelectedTextIdx] && updated[lastSelectedTextIdx].type === 'text') {
                updated[lastSelectedTextIdx] = {
                    ...updated[lastSelectedTextIdx],
                    fontSize: value
                };
            }
            return updated;
        });
    };

    // Eraser tool logic (delete shape, draw, or text)
    const eraserRadius = 16; // pixels

    const eraseAtPoint = useCallback((x, y) => {
        setDrawnObjects(prev =>
            prev.filter(obj => {
                if (obj.type === 'draw') {
                    return !obj.points.some(pt =>
                        Math.hypot(pt.x - x, pt.y - y) < eraserRadius
                    );
                }
                // For shapes, check if point is inside shape
                if (obj.type === 'rect') {
                    return !(x >= obj.x && x <= obj.x + obj.width && y >= obj.y && y <= obj.y + obj.height);
                }
                if (obj.type === 'circle') {
                    return !(Math.hypot(obj.x - x, obj.y - y) <= obj.radius);
                }
                if (obj.type === 'triangle') {
                    return !(x >= obj.x - obj.size && x <= obj.x + obj.size &&
                        y >= obj.y - obj.size && y <= obj.y + obj.size);
                }
                if (obj.type === 'line') {
                    return !(
                        Math.abs((obj.y2 - obj.y1) * x - (obj.x2 - obj.x1) * y + obj.x2 * obj.y1 - obj.y2 * obj.x1) /
// Math.hypot(obj.x2 - obj.x1, obj.y2 - obj.y1) < 10 &&
                        x >= Math.min(obj.x1, obj.x2) - 10 && x <= Math.max(obj.x1, obj.x2) + 10 &&
                        y >= Math.min(obj.y1, obj.y2) - 10 && y <= Math.max(obj.y1, obj.y2) + 10
                    );
                }
                if (obj.type === 'text') {
                    return !(x >= obj.x && x <= obj.x + obj.width && y >= obj.y && y <= obj.y + obj.height);
                }
                return true;
            })
        );
    }, []);

    const handleEraserDown = useCallback((e) => {
        if (activeTool !== 'Eraser') return;
        const { x, y } = getCoordinates(e);
        eraseAtPoint(x, y);
    }, [activeTool, eraseAtPoint]);

    const handleEraserMove = useCallback((e) => {
        if (activeTool !== 'Eraser') return;
        if (e.buttons !== 1) return;
        const { x, y } = getCoordinates(e);
        eraseAtPoint(x, y);
    }, [activeTool, eraseAtPoint]);

    // Keyboard events for Ctrl and Delete
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Control') setCtrlPressed(true);
            if (activeTool === 'Select' && selectedObjectIndices.length > 0 && (e.key === 'Delete' || e.key === 'Del')) {
                setDrawnObjects(prev => prev.filter((_, idx) => !selectedObjectIndices.includes(idx)));
                setSelectedObjectIndices([]);
                setShowFontSizeInput(false);
            }
        };
        const handleKeyUp = (e) => {
            if (e.key === 'Control') setCtrlPressed(false);
        };
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [activeTool, selectedObjectIndices]);

    // Add a demo rectangle for testing selection
    useEffect(() => {
        if (drawnObjects.length === 0) {
            setDrawnObjects([
                { type: 'rect', x: 100, y: 100, width: 120, height: 80 }
            ]);
        }
    }, []);

    // Redraw objects when changed or on resize
    useEffect(() => {
        redrawObjects();
    }, [drawnObjects, placingShape, placingText, selectedObjectIndices, redrawObjects]);

    useEffect(() => {
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);

        const canvas = canvasRef.current;

        // Draw tool events
        canvas.addEventListener('mousedown', startDrawing);
        canvas.addEventListener('mousemove', draw);
        canvas.addEventListener('mouseup', stopDrawing);
        canvas.addEventListener('mouseout', stopDrawing);

        // Eraser tool events
        canvas.addEventListener('mousedown', handleEraserDown);
        canvas.addEventListener('mousemove', handleEraserMove);

        // Shapes tool events
        canvas.addEventListener('mousedown', handleShapeMouseDown);
        canvas.addEventListener('mousemove', handleShapeMouseMove);
        canvas.addEventListener('mouseup', handleShapeMouseUp);

        // Text tool events
        canvas.addEventListener('mousedown', handleTextMouseDown);
        canvas.addEventListener('mousemove', handleTextMouseMove);
        canvas.addEventListener('mouseup', handleTextMouseUp);

        // Select tool events
        canvas.addEventListener('mousedown', handleSelectMouseDown);
        canvas.addEventListener('mousemove', handleSelectMouseMove);
        canvas.addEventListener('mouseup', handleSelectMouseUp);

        // Touch events (not implemented for select/eraser/text yet)
        canvas.addEventListener('touchstart', startDrawing);
        canvas.addEventListener('touchmove', draw);
        canvas.addEventListener('touchend', stopDrawing);
        canvas.addEventListener('touchcancel', stopDrawing);

        return () => {
            window.removeEventListener('resize', resizeCanvas);

            canvas.removeEventListener('mousedown', startDrawing);
            canvas.removeEventListener('mousemove', draw);
            canvas.removeEventListener('mouseup', stopDrawing);
            canvas.removeEventListener('mouseout', stopDrawing);

            canvas.removeEventListener('mousedown', handleEraserDown);
            canvas.removeEventListener('mousemove', handleEraserMove);

            canvas.removeEventListener('mousedown', handleShapeMouseDown);
            canvas.removeEventListener('mousemove', handleShapeMouseMove);
            canvas.removeEventListener('mouseup', handleShapeMouseUp);

            canvas.removeEventListener('mousedown', handleTextMouseDown);
            canvas.removeEventListener('mousemove', handleTextMouseMove);
            canvas.removeEventListener('mouseup', handleTextMouseUp);

            canvas.removeEventListener('mousedown', handleSelectMouseDown);
            canvas.removeEventListener('mousemove', handleSelectMouseMove);
            canvas.removeEventListener('mouseup', handleSelectMouseUp);

            canvas.removeEventListener('touchstart', startDrawing);
            canvas.removeEventListener('touchmove', draw);
            canvas.removeEventListener('touchend', stopDrawing);
            canvas.removeEventListener('touchcancel', stopDrawing);
        };
    }, [
        resizeCanvas,
        startDrawing,
        draw,
        stopDrawing,
        handleEraserDown,
        handleEraserMove,
        handleShapeMouseDown,
        handleShapeMouseMove,
        handleShapeMouseUp,
        handleTextMouseDown,
        handleTextMouseMove,
        handleTextMouseUp,
        handleSelectMouseDown,
        handleSelectMouseMove,
        handleSelectMouseUp
    ]);

    // Tool button data
    const toolButtons = [
        { key: 'Select', label: 'Select' },
        { key: 'Draw', label: 'Draw' },
        { key: 'Shapes', label: 'Shapes' },
        { key: 'Text', label: 'Text' },
        { key: 'Image', label: 'Image' },
        { key: 'Eraser', label: 'Eraser' },
    ];

    // Show shape bubble when "Shapes" is selected
    useEffect(() => {
        setShowShapeBubble(activeTool === 'Shapes');
        if (activeTool === 'Shapes' && shapesButtonRef.current) {
            const rect = shapesButtonRef.current.getBoundingClientRect();
            setShapeBubblePos({
                top: rect.top + window.scrollY,
                left: rect.right + 10 + window.scrollX
            });
        }
    }, [activeTool]);

    // Set cursor style based on active tool
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        if (activeTool === 'Draw') {
            canvas.style.cursor = "url(http://www.rw-designer.com/cursor-extern.php?id=12353), auto";
        } else if (activeTool === 'Eraser') {
            canvas.style.cursor = "url(http://www.rw-designer.com/cursor-extern.php?id=85157), auto";
        } else if (activeTool === 'Select') {
            canvas.style.cursor = 'pointer';
        } else {
            canvas.style.cursor = 'default';
        }
    }, [activeTool]);

    return (
        <div>
            {/* Panel Layout: 3 vertical sections */}
            <div
                style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '350px',
                    height: '100vh',
                    background: '#fafbfc',
                    borderRight: '1px solid #ccc',
                    zIndex: 2,
                    display: 'flex',
                    flexDirection: 'column',
                }}
            >
                {/* Tools Section (50%) */}
                <div style={{
                    padding: '24px 16px 16px 16px',
                    borderBottom: '1px solid #e0e0e0',
                    height: '50%',
                    boxSizing: 'border-box',
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'relative'
                }}>
                    <h2 style={{
                        margin: '0 0 24px 0',
                        fontSize: '1.25rem',
                        fontWeight: 'bold',
                        color: '#222',
                        textAlign: 'left'
                    }}>Tools</h2>
                    <div
                        style={{
                            flex: 1,
                            display: 'grid',
                            gridTemplateColumns: 'repeat(3, 1fr)',
                            gridTemplateRows: 'repeat(2, 1fr)',
                            gap: '18px',
                            justifyItems: 'stretch',
                            alignItems: 'stretch',
                        }}
                    >
                        {toolButtons.map(tool => (
                            <button
                                key={tool.key}
                                ref={tool.key === 'Shapes' ? shapesButtonRef : undefined}
                                onClick={() => setActiveTool(tool.key)}
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    background: activeTool === tool.key ? '#1976d2' : '#fff',
                                    color: activeTool === tool.key ? '#fff' : '#222',
                                    border: activeTool === tool.key ? '2px solid #1976d2' : '1px solid #ccc',
                                    borderRadius: '10px',
                                    fontSize: '1rem',
                                    cursor: 'pointer',
                                    fontWeight: 'bold',
                                    boxShadow: activeTool === tool.key
                                        ? '0 2px 6px rgba(25,118,210,0.12)'
                                        : '0 1px 2px rgba(0,0,0,0.04)',
                                    transition: 'background 0.2s, color 0.2s, border 0.2s',
                                    position: 'relative'
                                }}
                            >
                                {tool.label}
                            </button>
                        ))}
                    </div>
                    {/* Shape selection bubble (to the right of the Shapes button) */}
                    {showShapeBubble && (
                        <div style={{
                            position: 'absolute',
                            top: shapeBubblePos.top - window.scrollY,
                            left: shapeBubblePos.left - window.scrollX,
                            background: '#fff',
                            border: '1px solid #ccc',
                            borderRadius: '12px',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                            padding: '16px',
                            zIndex: 10,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            minWidth: '180px'
                        }}>
                            <div style={{ fontWeight: 'bold', marginBottom: '10px' }}>Select Shape</div>
                            {['Square', 'Circle', 'Triangle', 'Line'].map(shape => (
                                <button
                                    key={shape}
                                    onClick={() => setSelectedShape(shape)}
                                    style={{
                                        margin: '4px 0',
                                        padding: '8px 16px',
                                        borderRadius: '8px',
                                        border: selectedShape === shape ? '2px solid #1976d2' : '1px solid #ccc',
                                        background: selectedShape === shape ? '#1976d2' : '#fff',
                                        color: selectedShape === shape ? '#fff' : '#222',
                                        fontWeight: 'bold',
                                        cursor: 'pointer',
                                        width: '100%',
                                        transition: 'background 0.2s, color 0.2s, border 0.2s'
                                    }}
                                >
                                    {shape}
                                </button>
                            ))}
                        </div>
                    )}
                    {/* Font size input for text tool */}
                    {activeTool === 'Text' && !placingText && (
                        <div style={{
                            marginTop: 16,
                            display: 'flex',
                            alignItems: 'center'
                        }}>
                            <span style={{ marginRight: 8, fontWeight: 'bold' }}>Font Size:</span>
                            <input
                                type="number"
                                min="8"
                                max="48"
                                value={fontSize}
                                onChange={e => {
                                    let v = Number(e.target.value);
                                    if (v < 8) v = 8;
                                    if (v > 48) v = 48;
                                    setFontSize(v);
                                }}
                                style={{
                                    width: 60,
                                    padding: '4px 8px',
                                    borderRadius: '4px',
                                    border: '1px solid #ccc',
                                    fontSize: '1rem'
                                }}
                            />
                        </div>
                    )}
                </div>
                {/* Colors Section (25%) */}
                <div style={{
                    padding: '24px 16px 16px 16px',
                    borderBottom: '1px solid #e0e0e0',
                    height: '25%',
                    boxSizing: 'border-box',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start'
                }}>
                    <h3 style={{
                        margin: '0 0 12px 0',
                        fontSize: '1.1rem',
                        fontWeight: 'bold',
                        color: '#222'
                    }}>Colors</h3>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(4, 36px)',
                        gridTemplateRows: 'repeat(2, 36px)',
                        gap: '12px'
                    }}>
                        {colorPalette.map(color => (
                            <button
                                key={color.name}
                                aria-label={color.name}
                                onClick={() => setSelectedColor(color.value)}
                                style={{
                                    width: 36,
                                    height: 36,
                                    background: color.value,
                                    border: selectedColor === color.value ? '3px solid #1976d2' : '2px solid #ccc',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    outline: 'none',
                                    boxShadow: selectedColor === color.value
                                        ? '0 2px 8px rgba(25,118,210,0.18)'
                                        : 'none',
                                    transition: 'border 0.2s, box-shadow 0.2s'
                                }}
                            />
                        ))}
                    </div>
                </div>
                {/* Thickness Section (25%) */}
                <div style={{
                    padding: '24px 16px 16px 16px',
                    height: '25%',
                    boxSizing: 'border-box',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    justifyContent: 'flex-start'
                }}>
                    <h3 style={{
                        margin: '0 0 12px 0',
                        fontSize: '1.1rem',
                        fontWeight: 'bold',
                        color: '#222'
                    }}>Thickness</h3>
                    <div style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px'
                    }}>
                        <input
                            type="range"
                            min={1}
                            max={24}
                            value={thickness}
                            onChange={e => setThickness(Number(e.target.value))}
                            style={{
                                flex: 1,
                                accentColor: '#1976d2'
                            }}
                        />
                        <span style={{
                            fontWeight: 'bold',
                            fontSize: '1rem',
                            minWidth: 32,
                            textAlign: 'center'
                        }}>{thickness}px</span>
                    </div>
                    <div style={{
                        marginTop: 8,
                        fontSize: '0.95rem',
                        color: '#555'
                    }}>
                        Applies to Draw tool and shape outlines.
                    </div>
                </div>
            </div>
            {/* Canvas */}
            <canvas
                ref={canvasRef}
                style={{
                    display: 'block',
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '100vw',
                    height: '100vh',
                    border: '1px solid black',
                    background: 'white',
                    touchAction: 'none',
                    zIndex: 1,
                }}
            />
            {/* Text input overlay */}
            {showTextInput && (
                <textarea
                    autoFocus
                    value={textInput}
                    onChange={e => setTextInput(e.target.value)}
                    onBlur={handleTextInputBlur}
                    style={{
                        position: 'fixed',
                        top: textInputPos.top,
                        left: textInputPos.left,
                        width: textInputPos.width || 80,
                        height: textInputPos.height || 40,
                        fontSize: fontSize,
                        fontFamily: 'Arial, sans-serif',
                        border: '2px solid #1976d2',
                        borderRadius: '6px',
                        padding: '6px',
                        zIndex: 1000,
                        background: '#fff',
                        color: '#222',
                        resize: 'none'
                    }}
                />
            )}
            {/* Font size input for selected text object */}
            {showFontSizeInput && lastSelectedTextIdx !== null && drawnObjects[lastSelectedTextIdx] &&
                drawnObjects[lastSelectedTextIdx].type === 'text' && (
                <div style={{
                    position: 'fixed',
                    top: fontSizeInputPos.top,
                    left: fontSizeInputPos.left,
                    background: '#fff',
                    border: '1px solid #1976d2',
                    borderRadius: '8px',
                    boxShadow: '0 2px 8px rgba(25,118,210,0.12)',
                    padding: '8px 12px',
                    zIndex: 100,
                    display: 'flex',
                    alignItems: 'center'
                }}>
                    <span style={{ marginRight: 8, fontWeight: 'bold' }}>Font Size:</span>
                    <input
                        type="number"
                        min="8"
                        max="48"
                        value={fontSize}
                        onChange={handleFontSizeChange}
                        style={{
                            width: 60,
                            padding: '4px 8px',
                            borderRadius: '4px',
                            border: '1px solid #ccc',
                            fontSize: '1rem'
                        }}
                    />
                </div>
            )}
        </div>
    );
}

export default App;

