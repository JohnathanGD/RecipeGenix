import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { VscAccount } from "react-icons/vsc";

const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [authenticated, setAuthenticated] = useState(
    () => !!localStorage.getItem("token")
  );

  useEffect(() => {
    setAuthenticated(!!localStorage.getItem("token"));
  }, [location.pathname]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setAuthenticated(false);
    navigate("/", { replace: true });
  };

  return (
    <header className="header">
      <div className="logo-wrap">
        <div className="logo-mark">R</div>
        <div className="logo-text">RecipeGenix</div>
      </div>

      <nav>
        <ul className="nav-links">
          <li>
            <Link to="/">Home</Link>
          </li>
          {authenticated && (
            <li>
              <Link to="/dashboard">Dashboard</Link>
            </li>
          )}
          <li>
            <Link to="/about">About</Link>
          </li>
          {authenticated ? (
            <li>
              <button
                type="button"
                className="nav-link-btn"
                onClick={handleLogout}
              >
                Logout
              </button>
            </li>
          ) : (
            <>
              <li>
                <Link to="/login">Login</Link>
              </li>
              <li>
                <Link to="/signup">Sign up</Link>
              </li>
            </>
          )}
          {authenticated && (
            <li>
              <Link
                to="/account"
                className="header-account-link"
                title="Account and preferences"
                aria-label="Account and preferences"
              >
                <VscAccount />
              </Link>
            </li>
          )}
        </ul>
      </nav>
    </header>
  );
};

export default Header;
