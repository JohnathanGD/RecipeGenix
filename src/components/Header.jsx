import React from 'react';
import { VscAccount } from "react-icons/vsc";



const Header = () => {
    return (
      <header className="header">
        <div className="logo-wrap">
          <div className="logo-mark">R</div>
          <div className="logo-text">RecipeGenix</div>
        </div>
  
        <nav>
          <ul className="nav-links">
            <li><a href="/">Home</a></li>
            <li><a href="/dashboard">Dashboard</a></li>
            <li><a href="/about">About</a></li>
            <li><a href="/login">Login</a></li>
            <a href="/account"><VscAccount /></a>
          </ul>
        </nav>
      </header>
    );
  };

export default Header;
