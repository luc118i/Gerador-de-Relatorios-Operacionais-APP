interface ComposicaoRelatorioProps {
  showSectionViagem: boolean;
  onChangeViagem: (v: boolean) => void;
  showSectionIdentificacao: boolean;
  onChangeIdentificacao: (v: boolean) => void;
  showSectionDados: boolean;
  onChangeDados: (v: boolean) => void;
  showSectionTripulacao: boolean;
  onChangeTripulacao: (v: boolean) => void;
  showSectionPassageiros: boolean;
  onChangePassageiros: (v: boolean) => void;
}

export function ComposicaoRelatorio({
  showSectionViagem, onChangeViagem,
  showSectionIdentificacao, onChangeIdentificacao,
  showSectionDados, onChangeDados,
  showSectionTripulacao, onChangeTripulacao,
  showSectionPassageiros, onChangePassageiros,
}: ComposicaoRelatorioProps) {
  const sections = [
    {
      label: "Dados da Viagem",
      sub: "Linha, itinerário e horário da viagem",
      value: showSectionViagem,
      onChange: onChangeViagem,
    },
    {
      label: "Identificação do Relatório",
      sub: "Nome do relatório, operador CCO e KM",
      value: showSectionIdentificacao,
      onChange: onChangeIdentificacao,
    },
    {
      label: "Dados da Ocorrência",
      sub: "Data, horário, local e prefixo",
      value: showSectionDados,
      onChange: onChangeDados,
    },
    {
      label: "Tripulação",
      sub: "Motoristas vinculados à ocorrência",
      value: showSectionTripulacao,
      onChange: onChangeTripulacao,
    },
    {
      label: "Passageiros",
      sub: "Quantidade e passageiros em conexão",
      value: showSectionPassageiros,
      onChange: onChangePassageiros,
    },
  ];

  const activeCount = sections.filter((s) => s.value).length;

  return (
    <section className="animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-200">
        <div>
          <h2 className="text-base font-semibold text-gray-900">
            Composição do Relatório
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Defina quais blocos aparecerão no PDF gerado
          </p>
        </div>
        <span className="text-xs text-gray-400 font-medium tabular-nums">
          {activeCount} / 5 seções ativas
        </span>
      </div>
      <div className="grid grid-cols-1 gap-2">
        {sections.map(({ label, sub, value, onChange }) => (
          <label
            key={label}
            className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all duration-200 ${
              value
                ? "border-orange-200 bg-orange-50/50"
                : "border-gray-200 bg-gray-50 opacity-60"
            }`}
          >
            <div>
              <p className="text-sm font-medium text-gray-800">{label}</p>
              <p className="text-xs text-gray-500">{sub}</p>
            </div>
            <input
              type="checkbox"
              checked={value}
              onChange={(e) => onChange(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-orange-500 focus:ring-orange-400 cursor-pointer ml-4 flex-shrink-0"
            />
          </label>
        ))}
      </div>
    </section>
  );
}
