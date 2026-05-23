import "./Navbar.css";
import logo from "../assets/bpt.png";

type NavbarProps = {
    activePage: string;
    setActivePage: (page: string) => void;
};

const navItems = ["Map", "Settings"];

export default function Navbar({ activePage, setActivePage }: NavbarProps) {
    return (
        <header className="navbar">
            <h1 className="navbar-logo">
                <img className="navbar-logo-img" src={logo} alt="2B Sales Map logo" />
                2B Sales Map
            </h1>
            <nav className="navbar-links">
                {navItems.map((item) => (
                    <button
                        key={item}
                        onClick={() => setActivePage(item)}
                        className={`nav-button ${activePage === item ? "active" : ""}`}
                    >
                        {item}
                    </button>
                ))}
            </nav>
        </header>
    );
}
