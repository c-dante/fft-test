import fourier from 'fourier';

export const magPlot = (
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

export const fftCanvas = (canvas: HTMLCanvasElement): void => {
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
