import React from 'react';
import ReactDOM from 'react-dom';
import './userWorker';
import { App } from "./components/App.tsx";
import SqlFooter from "./components/Footer.tsx";

ReactDOM.render(
    <React.StrictMode>
        <App/>
        <SqlFooter/>
    </React.StrictMode>,
    document.getElementById('root')
);
