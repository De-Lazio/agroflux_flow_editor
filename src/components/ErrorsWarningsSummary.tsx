interface ErrorsWarningsSummaryProps {
  errors: string[];
  warnings: string[];
}

// Bloc "erreurs bloquantes / avertissements" partagé par ValidationPanel et
// BuildPanel (même données, même code couleur, deux endroits qui les affichent).
const ErrorsWarningsSummary = ({ errors, warnings }: ErrorsWarningsSummaryProps) => (
  <>
    {errors.length > 0 && (
      <div>
        <div className="text-xs font-bold text-red-600 mb-2 uppercase tracking-widest flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
          Erreurs Bloquantes ({errors.length})
        </div>
        <div className="space-y-1">
          {errors.map((err, i) => (
            <div key={i} className="p-3 bg-red-50 border-l-4 border-red-500 text-sm text-red-800 rounded-r-md">
              {err}
            </div>
          ))}
        </div>
      </div>
    )}

    {warnings.length > 0 && (
      <div>
        <div className="text-xs font-bold text-amber-600 mb-2 uppercase tracking-widest flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-500"></span>
          Avertissements ({warnings.length})
        </div>
        <div className="space-y-1">
          {warnings.map((warn, i) => (
            <div key={i} className="p-3 bg-amber-50 border-l-4 border-amber-500 text-sm text-amber-800 rounded-r-md">
              {warn}
            </div>
          ))}
        </div>
      </div>
    )}
  </>
);

export default ErrorsWarningsSummary;
