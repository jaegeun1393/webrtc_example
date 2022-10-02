import React, { useState, useEffect } from "react";
import { Routes , Route } from "react-router-dom";

import Classroom from "./classroom/Classroom";
import './App.css';

function App() {
  return (
    <div className="App">
      <Routes >
      <Route path="/:id" element={<Classroom />}></Route>

      </Routes >
    </div>
  );
}

export default App;
