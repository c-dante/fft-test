import React, { useState, useCallback, useEffect, useRef } from 'react';
import fourier from 'fourier';
import fp from 'lodash/fp';
import { MemoImageSelect } from './image';
import { MemoDragWindow } from './dragWindow';
import { closestPowerOfTwo } from './util';

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
};

const testPixels = (imageData: ImageData, width: number): void => {
	const len = width * width;
	const asRgba = new Uint32Array(imageData.data.buffer);

	// Fill in the heap with the pixel data
	const heap = fourier.custom.alloc(len, 3);
	const fftRunner = fourier.custom[`fft_f32_${len}_asm`](window, null, heap);
	fftRunner.init();

	// Fill heap
	const heapEdit = new Float32Array(heap);
	asRgba.forEach((pixel, i) => {
		heapEdit[i] = pixel & 0xFFFFFF;
		heapEdit[i + len] = 0;
	});

	// Run transformations
	fftRunner.transform();

	// Extract back into real/imag
	const output = new Float32Array(len);
	const imag = new Float32Array(len);
	fourier.custom.heap2array(new Float32Array(heap), output, len, 0);
	fourier.custom.heap2array(new Float32Array(heap), imag, len, len);
	for (let i = 0; i < output.length; i++) {
		const mag = Math.sqrt((output[i] * output[i]) + (imag[i] * imag[i]));
		asRgba[i] = Math.floor(mag) | 0xFF000000;
	}

	// Now reverse it
	// output.forEach((pixel, i) => {
	// 	heapEdit[i] = imag[i];
	// 	heapEdit[i + len] = pixel;
	// });

	// fftRunner.transform();
	// fourier.custom.heap2array(new Float32Array(heap), output, len, 0);
	// fourier.custom.heap2array(new Float32Array(heap), imag, len, len);
	// for (let i = 0; i < output.length; i++) {
	// 	const real = output[i] / len;
	// 	const im = imag[i] / len;
	// 	const mag = Math.sqrt(real * real + im * im);
	// 	asRgba[i] = Math.floor(mag) | 0xFF000000;
	// }
}

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

export const App = (): JSX.Element => {
	const bufferCanvas = useRef<any>();
	const [canvas, setCanvas] = useState<HTMLCanvasElement>();
	const [fitSize, setFitSize] = useState<number>(0);
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
			<canvas ref={bufferCanvas} style={{ display: 'none', position: 'absolute' }} />
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
					<button>Reverse</button>
				</div>
			</div>
			<MemoDragWindow style={{ backgroundColor: 'gainsboro' }}>
				<MemoImageSelect onImageSelect={(image) => {
					console.debug(image, bufferCanvas.current);
					console.time('playground');
					const buffer = bufferCanvas?.current;
					if (buffer) {
						buffer.setAttribute('width', `${fitSize}px`);
						buffer.setAttribute('height', `${fitSize}px`);
						const ctx2d = buffer.getContext('2d');
						if (ctx2d) {
							ctx2d.drawImage(image, 0, 0);
							const imageData = ctx2d.getImageData(0, 0, fitSize, fitSize);
							testPixels(imageData, fitSize);
							const target = canvas?.getContext('2d');
							if (target) {
								target.putImageData(imageData, 0, 0);
							}
						}
					}
					console.timeEnd('playground');
				}} />
			</MemoDragWindow>
		</div>
	);
};
