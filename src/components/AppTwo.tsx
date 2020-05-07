import React, { useEffect, useState, useRef } from 'react';

import { ImageInput } from './image';
import { closestPowerOfTwo } from './util';

type FftImageProps = {
	size?: number;
	src?: ImageBitmap;
};

const FftImage = ({
	size = 0,
	src,
}: FftImageProps): JSX.Element => {
	const canvasRef = useRef<HTMLCanvasElement | any>();

	useEffect(() => {
		const canvas = canvasRef.current;
		if (canvas && (size ?? 0) > 0) {
			if (canvas.width !== size) {
				canvas.setAttribute('width', `${size}px`);
				canvas.setAttribute('height', `${size}px`);
			}
		}
	}, [canvasRef, size]);

	useEffect(() => {
		const canvas: HTMLCanvasElement = canvasRef.current;
		if (canvas && src) {
			const ctx2d = canvas.getContext('2d');
			ctx2d?.clearRect(0, 0, size, size);
			// @todo: aspect ratio scale down
			ctx2d?.drawImage(src, 0, 0, size, size);
		}
	}, [canvasRef, src, size]);

	return (
		<canvas ref={canvasRef} />
	);
};

export const App = (): JSX.Element => {
	const [fitSize, setFitSize] = useState<number>(0);
	const [leftImage, setLeftImage] = useState<ImageBitmap>();
	const [rightImage, setRightImage] = useState<ImageBitmap>();

	useEffect(() => () => {
		if (leftImage) {
			leftImage.close();
		}
	}, [leftImage]);

	useEffect(() => () => {
		if (rightImage) {
			rightImage.close();
		}
	}, [rightImage]);

	useEffect(() => {
		const updateSize = (): void => setFitSize(
			closestPowerOfTwo(document.body.clientWidth / 2 - 200)
		);
		window.addEventListener('resize', updateSize);
		updateSize();

		return () => {
			window.removeEventListener('resize', updateSize);
		};
	}, [setFitSize]);

	return (
		<div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
			<h2>Test App</h2>
			<div style={{ display: 'flex', alignItems: 'center' }}>
				<div>
					<FftImage size={fitSize} src={leftImage} />
					<ImageInput onImageSelect={setLeftImage} />
				</div>
				<div style={{ display: 'flex', flexDirection: 'column', marginLeft: '10px', marginRight: '10px' }}>
					<button onClick={() => {
						createImageBitmap(leftImage).then(copy => setRightImage(copy));
					}}>transfer right -&gt;</button>
					<button onClick={() =>{
						createImageBitmap(rightImage).then(copy => setLeftImage(copy));
					}}>&lt;- transfer left</button>
				</div>
				<div>
					<FftImage size={fitSize} src={rightImage} />
					<ImageInput onImageSelect={setRightImage} />
				</div>
			</div>
		</div>
	);
};
