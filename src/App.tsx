import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'

function App() {
  return (
    <div className="container mx-auto p-4">
      <header className="text-center mb-8">
        <h1 className="text-4xl font-bold">Herramienta para padres con adolescentes</h1>
        <p className="text-lg text-gray-600">Familias estelares</p>
      </header>
      <div className="grid grid-cols-2 gap-4">
        <div className="card bg-white p-6 shadow-md">
          <h2 className="text-xl font-semibold">Sistema de puntos
       privilegios</h2>
        </div>
      </div>
    </div>
  );
}


export default App
