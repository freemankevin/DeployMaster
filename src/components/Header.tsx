const Header = () => {
  return (
    <header className="h-16 bg-background-secondary/80 backdrop-blur-xl border-b border-border-primary flex items-center px-6 sticky top-0 z-20">
      <div className="flex items-center gap-4">
        <h2 className="text-[17px] font-semibold text-white tracking-tight">Host Management</h2>
      </div>
    </header>
  );
};

export default Header;