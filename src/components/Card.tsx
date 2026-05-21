import type { ReactNode } from "react";
import "./Card.css";

type CardProps = {
    title?: string;
    description?: string;
    actions?: ReactNode;
    children?: ReactNode;
    className?: string;
};

export default function Card({ title, description, actions, children, className = "" }: CardProps) {
    return (
        <section className={`card ${className}`.trim()}>
            {(title || description || actions) && (
                <header className="card-header">
                    <div>
                        {title && <h2>{title}</h2>}
                        {description && <p>{description}</p>}
                    </div>
                    {actions && <div className="card-actions">{actions}</div>}
                </header>
            )}
            {children && <div className="card-body">{children}</div>}
        </section>
    );
}
