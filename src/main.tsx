import React from 'react';
import ReactDOM from 'react-dom';
import './userWorker';
import { App } from "./components/App.tsx";

ReactDOM.render(
    <React.StrictMode>
        <App/>
    </React.StrictMode>,
    document.getElementById('root')
);
