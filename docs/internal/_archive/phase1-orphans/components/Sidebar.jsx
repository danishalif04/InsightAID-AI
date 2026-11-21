import {
  LayoutDashboard,
  MessageSquare,
  ShieldAlert,
  TrendingUp,
  Database,
  FileText,
  Settings,
  Bot,
  Share2
} from "lucide-react"


function Sidebar() {

  return (
    <aside className="w-64 min-h-screen bg-slate-900 text-white p-5">

      {/* Logo */}
      <h1 className="text-2xl font-bold mb-8">
        INSIGHTAID AI
      </h1>


      {/* Navigation */}
      <nav className="space-y-3">


        <a href="/dashboard" 
          className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-800">
          <LayoutDashboard size={20}/>
          Dashboard
        </a>


        <a href="/sentiment"
          className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-800">
          <MessageSquare size={20}/>
          Sentiment
        </a>


        <a href="/crisis"
          className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-800">
          <ShieldAlert size={20}/>
          Crisis Detection
        </a>


        <a href="/forecast"
          className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-800">
          <TrendingUp size={20}/>
          Forecast
        </a>


        <a href="/social"
          className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-800">
          <Share2 size={20}/>
          Social Media
        </a>


        <a href="/ai"
          className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-800">
          <Bot size={20}/>
          AI Recommendation
        </a>


        <a href="/dataset"
          className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-800">
          <Database size={20}/>
          Dataset
        </a>


        <a href="/report"
          className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-800">
          <FileText size={20}/>
          Reports
        </a>


        <a href="/settings"
          className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-800">
          <Settings size={20}/>
          Settings
        </a>


      </nav>

    </aside>
  )
}


export default Sidebar