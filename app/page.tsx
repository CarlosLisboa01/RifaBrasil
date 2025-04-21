import Link from 'next/link';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="z-10 w-full max-w-4xl text-center">
        <div className="inline-flex items-center justify-center mb-6">
          <h1 className="text-6xl font-bold text-title">
            RifaBrasil
          </h1>
          <span className="ml-4 text-sm bg-yellow-400 text-black px-3 py-1 rounded-full font-bold">Oficial</span>
        </div>
        <p className="text-xl mb-10 text-important">
          Participe das nossas rifas e concorra a prêmios incríveis!
        </p>
        
        <div className="flex justify-center">
          <Link 
            href="/participar" 
            className="bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-8 rounded-lg text-xl transition-colors duration-300"
          >
            Participar Agora
          </Link>
        </div>
        
        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white p-6 rounded-xl shadow-md border-t-4 border-green-600">
            <div className="bg-green-100 w-16 h-16 flex items-center justify-center rounded-full mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-title mb-4">Fácil de Participar</h2>
            <p className="text-description">Apenas alguns cliques para se inscrever em qualquer rifa disponível.</p>
          </div>
          
          <div className="bg-white p-6 rounded-xl shadow-md border-t-4 border-green-600">
            <div className="bg-green-100 w-16 h-16 flex items-center justify-center rounded-full mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-title mb-4">100% Transparente</h2>
            <p className="text-description">Rifas realizadas com total transparência e resultados verificáveis.</p>
          </div>
          
          <div className="bg-white p-6 rounded-xl shadow-md border-t-4 border-yellow-400">
            <div className="bg-yellow-100 w-16 h-16 flex items-center justify-center rounded-full mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-title mb-4">Prêmios Diversos</h2>
            <p className="text-description">Diversas rifas com diferentes prêmios acontecendo regularmente.</p>
          </div>
        </div>
      </div>
    </main>
  );
}
