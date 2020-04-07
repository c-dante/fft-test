export interface Point {
	x: number;
	y: number;
}

export const getEventPosition = (e: any): Point => {
	if (e?.touches?.[0]) {
		return {
			x: e.touches[0].clientX,
			y: e.touches[0].clientY,
		}
	}

	return { x: e.clientX, y: e.clientY };
};

export const getElementPosition = (elt: any): Point => {
	const rect = elt.getBoundingClientRect();
	return { x: rect.left, y: rect.top };
};
