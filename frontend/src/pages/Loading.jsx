const Loading = () => {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#061E29] text-slate-100 relative overflow-hidden">
      <div className="relative z-10 flex flex-col items-center gap-6">
        <div className="relative">
          <div className="absolute inset-0 rounded-3xl bg-blue-500/20 blur-2xl" />
          <div className="relative size-20 rounded-2xl bg-slate-50 flex items-center justify-center">
            <img src="/CX.png" alt="ConnectX" className="p-2" />
          </div>
        </div>
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-semibold tracking-wide">Connecting...</h2>
          <p className="text-sm text-slate-400">Syncing your messages securely</p>
        </div>
      </div>
    </div>
  );
};

export default Loading;