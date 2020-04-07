import fp from 'lodash/fp';
import React, { memo, useState, useCallback, useEffect } from 'react';

export type ImageSelectProps = {
	onImageSelect?: (image: ImageBitmap) => void;
};

export const ImageSelect = ({
	onImageSelect = fp.noop,
}: ImageSelectProps): JSX.Element => {
	const [canvas, setCanvas] = useState<HTMLCanvasElement>();
	const [file, setFile] = useState<File>();
	const [image, setImage] = useState<ImageBitmap>();
	const [error, setError] = useState<string>();

	const canvasWidth = 300;
	const canvasHeight = 150;

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
			const ctx2d = canvas.getContext('2d');
			// @todo: aspect ratio scale down
			ctx2d?.drawImage(image, 0, 0, canvasWidth, canvasHeight);
		}
	}, [image, canvas]);

	// If we have a new file, try to load the image
	useEffect(() => {
		let useResult = true;
		if (file) {
			createImageBitmap(file).then(imageBmp => {
				if (useResult) {
					setImage(imageBmp);
					onImageSelect(imageBmp);
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
		<div style={{ display: 'flex', flexDirection: 'column' }}>
			<canvas ref={onCanvas} width={`${canvasWidth}px`} height={`${canvasHeight}px`} />
			<input
				onChange={(e) => {
					const newFile = e?.target?.files?.[0]
					if (newFile) {
						setFile(newFile);
					}
				}}
				type='file'
				accept='image/*'
			/>
			{error && (<pre>{error}</pre>)}
		</div>
	);
};
export const MemoImageSelect = memo(ImageSelect);
