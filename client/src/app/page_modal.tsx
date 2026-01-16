                  </div >
                </CardContent >
              </Card >
            );
          })}
{ reports.length === 0 && !loading && <div className="text-slate-400 italic">No research reports generated yet.</div> }
        </div >
      </div >

    {/* Email Generation Modal */ }
{
    emailModal.open && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h2 className="text-2xl font-bold text-slate-900">Generated Email</h2>
                            <p className="text-sm text-slate-500 mt-1">
                                {emailModal.lead?.company_name || 'Company'}
                            </p>
                        </div>
                        <button
                            onClick={() => setEmailModal({ open: false, lead: null, email: null, loading: false })}
                            className="text-slate-400 hover:text-slate-600"
                        >
                            ✕
                        </button>
                    </div>

                    {emailModal.loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                            <span className="ml-3 text-slate-600">Generating personalized email...</span>
                        </div>
                    ) : emailModal.email ? (
                        <div className="space-y-4">
                            {/* Subject */}
                            <div>
                                <label className="text-xs font-semibold text-slate-500 uppercase">Subject</label>
                                <div className="mt-1 p-3 bg-slate-50 rounded border border-slate-200">
                                    <p className="font-medium text-slate-900">{emailModal.email.subject}</p>
                                </div>
                            </div>

                            {/* Body */}
                            <div>
                                <label className="text-xs font-semibold text-slate-500 uppercase">Body</label>
                                <div className="mt-1 p-4 bg-slate-50 rounded border border-slate-200 whitespace-pre-wrap">
                                    <p className="text-slate-800 leading-relaxed">{emailModal.email.body}</p>
                                </div>
                            </div>

                            {/* Metadata */}
                            <div className="pt-4 border-t border-slate-200">
                                <div className="grid grid-cols-2 gap-3 text-sm">
                                    <div>
                                        <span className="text-slate-500">Template:</span>
                                        <span className="ml-2 text-slate-700 font-medium">{emailModal.email.template_category}</span>
                                    </div>
                                    <div>
                                        <span className="text-slate-500">Match Score:</span>
                                        <span className="ml-2 text-slate-700 font-medium">
                                            {(emailModal.email.template_match_score * 100).toFixed(0)}%
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-slate-500">LLM:</span>
                                        <span className="ml-2 text-slate-700 font-medium">{emailModal.email.llm_provider}</span>
                                    </div>
                                    <div>
                                        <span className="text-slate-500">Cost:</span>
                                        <span className="ml-2 text-slate-700 font-medium">${emailModal.email.cost?.toFixed(5)}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3 pt-4">
                                <Button onClick={copyEmail} className="flex-1 bg-blue-600 hover:bg-blue-700">
                                    📋 Copy Email
                                </Button>
                                <Button variant="outline" className="flex-1">
                                    📧 Send Email
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-8 text-slate-500">
                            Failed to generate email. Please try again.
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
    </div >
  );
}
