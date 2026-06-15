import { NavLink, Outlet } from 'react-router';

export default function AppLayout() {
  return (
    <>
      <div className="grid grid-cols-[auto_1fr]">
        <header>
          <div>
            <h1 className="text-red">FinFlow</h1>
          </div>
          <nav className="flex flex-col justify-start items-center">
            <NavLink to={'/dashboard'}>Dashboard</NavLink>
            <NavLink to={'/accounts'}>Accounts</NavLink>
            <NavLink to={'/expenses'}>Expenses</NavLink>
          </nav>
        </header>
        <main>
          <Outlet></Outlet>
        </main>
      </div>
    </>
  );
}
