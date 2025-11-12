const GlassPanel = ({
    as: Component = "div",
    className = "",
    children,
    ...rest
}) => {
    const classes = ["glass-panel", className].filter(Boolean).join(" ");
    return (
        <Component className={classes} {...rest}>
            {children}
        </Component>
    );
};

export default GlassPanel;
