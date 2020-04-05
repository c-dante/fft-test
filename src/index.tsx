import React from 'react';
import ReactDOM from 'react-dom';
import { App } from './components/App';

const root = document.createElement('div');
document.body.appendChild(root);
document.body.setAttribute('style', 'position: absolute; top: 0; bottom: 0; left: 0; right: 0;');

ReactDOM.render(<App />, root);
