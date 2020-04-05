import React, { useState, useCallback, useEffect } from 'react';
import fourier from 'fourier';
import fp from 'lodash/fp';

// const arr = new Array()
const stdlib = {
	Math: Math,
	Float32Array: Float32Array,
	Float64Array: Float64Array,
};

const test = (): void => {
	console.log(fourier);

	// Create heap for the fft data and twiddle factors
	const heap = fourier.custom.alloc(16, 3);

	// Create instance of FFT runner
	const fftRunner = fourier.custom.fft_f64_16_asm(stdlib, null, heap);
	console.debug(fftRunner);

	// Init twiddle factors
	fftRunner.init();

	// Run transformations
	fftRunner.transform();
}

const magPlot = (
	offset: number,
	scale: number,
	realArr: number[],
	imaginaryArr: number[],
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
	console.debug('!', canvas);

	const ctx2d = canvas.getContext('2d');
	if (ctx2d) {
		ctx2d.fillStyle = 'black';
		ctx2d.fillRect(0, 0, canvas.width, canvas.height);

		const scale = 5;

		// Draw our signal
		const signal = new Array(64).fill(0).map((x, i) => Math.sin(i * (Math.PI / 8)));
		ctx2d.strokeStyle = 'white';
		ctx2d.stroke(signalPlot(10, scale, signal));

		const [rfft, ifft] = fourier.dft(signal, (new Array(signal.length)).fill(0));
		console.debug({ rfft, ifft });
		ctx2d.strokeStyle = 'white';
		ctx2d.stroke(magPlot(10, scale, rfft, ifft));
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

	const onCanvas = useCallback(setCanvas, [setCanvas]);

	useEffect(() => {
		if (canvas) {
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
		setFitSize(
			closestPowerOfTwo(
				Math.min(document.body.clientWidth, document.body.clientHeight)
			)
		);
		window.addEventListener('resize', (e) => {
			setFitSize(
				closestPowerOfTwo(
					Math.min(document.body.clientWidth, document.body.clientHeight)
				)
			);
		})
	}, [setFitSize]);

	return (
		<div style={{
			display: 'flex',
			flexDirection: 'column',
			alignItems: 'center',
		}}>
			<canvas ref={onCanvas} onMouseMove={getWeird} onTouchMove={touchWeird} />
			<div style={{ height: '1em' }} />
			<button onClick={() => setWeird(!weird)}>
				{weird ? 'enough' : 'get weird'}
			</button>
		</div>
	);
};
