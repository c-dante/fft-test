import React, { memo, useState, useCallback, useEffect } from 'react';

export const Image = (): JSX.Element => {
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
export const MemoImage = memo(Image);
