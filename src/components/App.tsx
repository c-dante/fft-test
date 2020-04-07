import React, { memo, useRef, useState, useCallback, useEffect } from 'react';
import fourier from 'fourier';
import fp from 'lodash/fp';

interface Point {
	x: number;
	y: number;
}

const getEventPosition = (e: any): Point => {
	if (e?.touches?.[0]) {
		return {
			x: e.touches[0].clientX,
			y: e.touches[0].clientY,
		}
	}

	return { x: e.clientX, y: e.clientY };
};

const getElementPosition = (elt: any): Point => {
	const rect = elt.getBoundingClientRect();
	return { x: rect.left, y: rect.top };
};

const test = (): void => {
	const len = 16;
	const real = new Float64Array(len);
	const imag = new Float64Array(len);
	for (let i = 0; i < len; i++) {
		real[i] = Math.sin(Math.PI/8 * i);
		imag[i] = 0;
	}

	// Create + init runner and heap
	const heap = fourier.custom.alloc(len, 3);
	const fftRunner = fourier.custom[`fft_f64_${len}_asm`](window, null, heap);
	fftRunner.init();

	// Fill heap
	fourier.custom.array2heap(real, new Float64Array(heap), len, 0);
	fourier.custom.array2heap(imag, new Float64Array(heap), len, len);

	// Run transformations
	fftRunner.transform();

	// Extract back into real/imag
	fourier.custom.heap2array(new Float64Array(heap), real, len, 0);
	fourier.custom.heap2array(new Float64Array(heap), imag, len, len);
}
test();

const magPlot = (
	offset: number,
	scale: number,
	realArr: Float64Array,
	imaginaryArr: Float64Array,
): Path2D => {
	const p2 = new Path2D();
	p2.moveTo(offset, offset);
	realArr.forEach((real, x) => {
		const mag = Math.sqrt((real * real) + (imaginaryArr[x] * imaginaryArr[x]));
		p2.lineTo(offset + x * scale, offset + mag * scale);
	});
	return p2;
};

const signalPlot = (offset: number, scale: number, signal: number[]): Path2D => {
	const path = new Path2D();
	path.moveTo(offset, offset);
	signal.forEach((y, x) => {
		path.lineTo(offset + x * scale, offset + y * scale);
	});
	return path;
};

const render = (canvas: HTMLCanvasElement): void => {
	const ctx2d = canvas.getContext('2d');
	if (ctx2d) {
		ctx2d.fillStyle = 'black';
		ctx2d.fillRect(0, 0, canvas.width, canvas.height);

		const scale = 5;

		// Draw our signal
		const len = 64;
		const real = new Float64Array(len);
		const imag = new Float64Array(len);
		for (let i = 0; i < len; i++) {
			real[i] = Math.sin(Math.PI/8 * i);
			imag[i] = Math.cos(Math.PI/8 * i + Math.PI/2);
		}

		// Render the input signal
		ctx2d.strokeStyle = 'white';
		ctx2d.stroke(magPlot(10, scale, real, imag));


		// Create + init runner and heap
		const heap = fourier.custom.alloc(len, 3);
		const fftRunner = fourier.custom[`fft_f64_${len}_asm`](window, null, heap);
		fftRunner.init();

		// Fill heap
		fourier.custom.array2heap(real, new Float64Array(heap), len, 0);
		fourier.custom.array2heap(imag, new Float64Array(heap), len, len);

		// Run transformations
		fftRunner.transform();

		// Extract back into real/imag
		fourier.custom.heap2array(new Float64Array(heap), real, len, 0);
		fourier.custom.heap2array(new Float64Array(heap), imag, len, len);

		// Render the FFT signal
		ctx2d.strokeStyle = 'white';
		ctx2d.stroke(magPlot(10, scale, real, imag));
	}
};

const calcWeird = (
	data: Uint8ClampedArray,
	width: number,
	height: number,
	cx: number,
	cy: number,
): void => {
	let i = 0;
	// Distance from center
	const fact = Math.PI / 64;
	for (let x = 0; x < width; x++) {
		const localX = x - cy;
		const a = Math.sin(fact * localX) * Math.sin(fact * localX);
		for (let y = 0; y < height; y++) {
			const localY = y - cx;
			const b = Math.cos(fact * localY) * Math.cos(fact * localY);
			data[i++] = a * 0xFF; // R
			data[i++] = b * 0xFF; // G
			i++; //B
			i++; //A
		}
	}
};

const applyWeird = fp.throttle(50, (
	ctx2d: CanvasRenderingContext2D,
	width: number,
	height: number,
	mouseX: number,
	mouseY: number,
) => {
	console.time('get weird');
	const imageData = ctx2d.getImageData(0, 0, width, height);
	calcWeird(imageData.data, width, height, mouseX, mouseY);
	ctx2d.putImageData(imageData, 0, 0);
	console.timeEnd('get weird');
});

const closestPowerOfTwo = (n: number): number => {
	let i = 1 << 15; // this is for a screen size, assuming not working for 32768 pixel width
	while (i > 64 && i > n) { // low bound of 64 pixels
		i = i >> 1;
	}
	return i;
}

export const App = (): JSX.Element => {
	const [canvas, setCanvas] = useState<HTMLCanvasElement>();
	const [fitSize, setFitSize] = useState<number>();
	const [weird, setWeird] = useState(false);

	const onCanvas = useCallback(canvas => setCanvas(canvas), [setCanvas]);

	useEffect(() => {
		if (canvas && (fitSize ?? 0) > 0) {
			if (canvas.width !== fitSize) {
				canvas.setAttribute('width', `${fitSize}px`);
				canvas.setAttribute('height', `${fitSize}px`);
			}
			render(canvas);
		}
	}, [canvas, fitSize]);

	const getWeird = useCallback((e) => {
		if (canvas && weird) {
			e.preventDefault();
			const mouseX = e.clientX - canvas.offsetLeft;
			const mouseY = e.clientY - canvas.offsetTop;
			const ctx2d = canvas.getContext('2d');
			if (ctx2d) {
				applyWeird(ctx2d, canvas.width, canvas.height, mouseX, mouseY);
			}
		}
	}, [canvas, fitSize, weird]);

	const touchWeird = useCallback((e) => {
		e.preventDefault();
		const t = e.touches[0];
		if (canvas && weird && t) {
			const mouseX = t.clientX - canvas.offsetLeft;
			const mouseY = t.clientY - canvas.offsetTop;
			const ctx2d = canvas.getContext('2d');
			if (ctx2d) {
				applyWeird(ctx2d, canvas.width, canvas.height, mouseX, mouseY);
			}
		}
	}, [canvas, fitSize, weird]);

	useEffect(() => {
		const updateSize = (): void => setFitSize(
			closestPowerOfTwo(
				Math.min(document.body.clientWidth, document.body.clientHeight)
			)
		);
		window.addEventListener('resize', updateSize);
		updateSize();

		return () => {
			window.removeEventListener('resize', updateSize);
		};
	}, [setFitSize]);

	return (
		<div style={{
			display: 'flex',
			flexDirection: 'column',
			alignItems: 'center',
		}}>
			<canvas ref={onCanvas} onMouseMove={getWeird} onTouchMove={touchWeird} />
			<div style={{ height: '1em' }} />
			<div style={{
				display: 'flex',
				overflow: 'auto',
				flex: '1 0 auto',
			}}>
				<div style={{ marginRight: '1em' }}>
					<button onClick={() => setWeird(!weird)}>
						{weird ? 'enough' : 'get weird'}
					</button>
				</div>
			</div>
			<MemoDragWindow>
				<MemoImage />
			</MemoDragWindow>
		</div>
	);
};

const DragWindow = ({ children }: any): JSX.Element => {
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
				display: 'flex',
				flexDirection: 'column',
				position: 'absolute',
				top: `${position.y}px`,
				left: `${position.x}px`,
				backgroundColor: '#000000',
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
			{!hide && children}
		</div>
	);
};
const MemoDragWindow = memo(DragWindow);


const Image = (): JSX.Element => {
	const [canvas, setCanvas] = useState<HTMLCanvasElement>();
	const [file, setFile] = useState<File>();
	const [image, setImage] = useState<ImageBitmap>();
	const [error, setError] = useState<string>();

	// Ensure we clean up if we change images
	useEffect(() => {
		const oldImage = image;
		return () => {
			if (oldImage) {
				oldImage.close();
			}
		}
	}, [image]);

	// If we have an image + context, render it
	useEffect(() => {
		if (image && canvas) {
			console.debug({image, canvas});
			const ctx2d = canvas.getContext('2d');
			ctx2d?.drawImage(image, 0, 0);
		}
	}, [image, canvas]);

	// If we have a new file, try to load the image
	useEffect(() => {
		let useResult = true;
		if (file) {
			createImageBitmap(file).then(imageBmp => {
				if (useResult) {
					setImage(imageBmp);
				} else {
					imageBmp.close();
				}
			}, error => {
				console.error(error);
				setError(JSON.stringify(error));
			})
		}

		return () => {
			useResult = false;
		}
	}, [file]);

	const onCanvas = useCallback(c => setCanvas(c), [setCanvas]);

	return (
		<div>
			<canvas ref={onCanvas} />
			<input
				onChange={(e) => {
					setFile(e?.target?.files?.[0]);
				}}
				type='file'
				accept='image/*'
			/>
			{error && (<pre>{error}</pre>)}
		</div>
	);
};
const MemoImage = memo(Image);
