function Navbar() {

  return (
    <header className="h-16 bg-white border-b flex items-center justify-between px-6">

      <h2 className="text-xl font-semibold">
        Business Intelligence Dashboard
      </h2>


      <div className="flex items-center gap-4">

        <span>
          Welcome, Founder
        </span>


        <div className="w-10 h-10 bg-slate-300 rounded-full flex items-center justify-center">
          AI
        </div>

      </div>

    </header>
  )
}


export default Navbar