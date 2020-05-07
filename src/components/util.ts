export const closestPowerOfTwo = (n: number): number => {
	let i = 1 << 15; // this is for a screen size, assuming not working for 32768 pixel width
	while (i > 64 && i > n) { // low bound of 64 pixels
		i = i >> 1;
	}
	return i;
};

type Rgba = {
	r: number;
	g: number;
	b: number;
	a: number;
};

export const splitColor = (rgba: number): Rgba => {
	const r = rgba & 0xFF;
	const g = (rgba >> 8) & 0xFF;
	const b = (rgba >> 16) & 0xFF;
	const a = (rgba >> 24) & 0xFF;

	return { r, g, b, a };
};
