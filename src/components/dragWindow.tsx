import fp from 'lodash/fp';

import React, { memo, useRef, useState, useEffect } from 'react';
import { getElementPosition, getEventPosition, Point } from './domUtil';

export type DragWindowProps = {
	children: JSX.Element;
	style?: object;
};

export const DragWindow = ({ children, style }: DragWindowProps): JSX.Element => {
	const eltRef = useRef<any>();
	const [dragging, setDragging] = useState<{ origin: Point; start: Point }>();
	const [hide, setHide] = useState(false);
	const [position, setPosition] = useState<Point>({ x: 0, y: document.body.clientHeight - 250});

	// Window mouseup clear drag
	useEffect(() => {
		const clear = (): void => {
			if (dragging) {
				setDragging(undefined);
			}
		};
		window.addEventListener('mouseup', clear);
		window.addEventListener('touchend', clear);
		return () => {
			window.removeEventListener('mouseup', clear);
			window.removeEventListener('touchend', clear);
		};
	}, [dragging]);

	useEffect(() => {
		if (!dragging) {
			return fp.noop;
		}

		const updatePosition = (e: TouchEvent | MouseEvent): void => {
			e.preventDefault();
			e.stopImmediatePropagation();
			const newPosition = getEventPosition(e);
			newPosition.x = dragging.origin.x + (newPosition.x - dragging.start.x);
			newPosition.y = dragging.origin.y + (newPosition.y - dragging.start.y);
			setPosition(newPosition);
		}
		window.addEventListener('mousemove', updatePosition);
		window.addEventListener('touchmove', updatePosition);
		return () => {
			window.removeEventListener('mousemove', updatePosition);
			window.removeEventListener('touchmove', updatePosition);
		};
	}, [dragging]);

	return (
		<div
			ref={eltRef}
			style={{
				...style,
				display: 'flex',
				flexDirection: 'column',
				position: 'absolute',
				top: `${position.y}px`,
				left: `${position.x}px`,
			}}
		>
			<div style={{ flex: '1 0 auto', display: 'flex' }}>
				<button
					style={{ flex: '1 0 auto' }}
					onMouseDown={(e) => {
						e.preventDefault();
						setDragging({ origin: getElementPosition(eltRef.current), start: getEventPosition(e) })
					}}
					onTouchStart={(e) => {
						e.preventDefault();
						setDragging({ origin: getElementPosition(eltRef.current), start: getEventPosition(e) })
					}}
				>move</button>
				<button onClick={() => setHide(!hide)}>
					{hide ? 'Show' : 'Hide'}
				</button>
			</div>
			<div style={{
				display: hide ? 'none' : undefined,
			}}>
				{children}
			</div>
		</div>
	);
};
export const MemoDragWindow = memo(DragWindow);
