import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { supabase } from "@/integrations/supabase/client"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"
import { FileText, Download, FileSpreadsheet, Printer, Calendar, Users, Shield, FileCode, FileJson, Scale } from "lucide-react"
import { formatarTempoRegistro, formatarDataRegistro, calcularHorasTrabalhadas, calcularSaldo } from "@/integrations/supabase/ponto-digital"
import type { Funcionario, RegistroPonto } from "@/integrations/supabase/ponto-digital"
import { obterRegistrosPorMes } from "@/lib/ponto-utils"

const AdminReports = () => {
  const { company } = useAuth()
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([])
  const [funcionarioId, setFuncionarioId] = useState("all")
  const [mes, setMes] = useState((new Date().getMonth() + 1).toString())
  const [ano, setAno] = useState(new Date().getFullYear().toString())
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (company?.id) {
      carregarFuncionarios()
    }
  }, [company])

  const carregarFuncionarios = async () => {
    if (!company?.id) return
    const { data } = await supabase
      .from("funcionarios")
      .select("*")
      .eq("empresa_id", company.id)
      .eq("ativo", true)
      .order("nome")

    if (data) setFuncionarios(data)
  }

  const carregarRegistros = async (): Promise<{
    registrosPorFunc: Record<string, RegistroPonto[]>
    funcMap: Map<string, Funcionario>
  }> => {
    const mesNum = parseInt(mes)
    const anoNum = parseInt(ano)

    let dados: RegistroPonto[] = []
    if (funcionarioId === "all") {
      const todosFunc = await supabase
        .from("funcionarios")
        .select("id")
        .eq("empresa_id", company.id)
        .eq("ativo", true)
      const ids = todosFunc.data?.map(f => f.id) || []

      for (const id of ids) {
        const regs = await obterRegistrosPorMes(id, mesNum, anoNum)
        dados.push(...regs)
      }
    } else {
      dados = await obterRegistrosPorMes(funcionarioId, mesNum, anoNum)
    }

    const registrosPorFunc: Record<string, RegistroPonto[]> = {}
    for (const r of dados) {
      if (!registrosPorFunc[r.funcionario_id]) registrosPorFunc[r.funcionario_id] = []
      registrosPorFunc[r.funcionario_id].push(r)
    }

    const funcMap = new Map(funcionarios.map(f => [f.id, f]))
    return { registrosPorFunc, funcMap }
  }

  const gerarRelatorioComum = async (tipo: 'pdf' | 'csv') => {
    if (!company?.id) return
    setLoading(true)
    try {
      const { registrosPorFunc, funcMap } = await carregarRegistros()

      if (tipo === 'pdf') {
        const { default: jsPDF } = await import('jspdf')
        const doc = new jsPDF()

        doc.setFontSize(18)
        doc.text("Relatório de Ponto", 14, 20)
        doc.setFontSize(10)
        doc.text(`${company?.nome_fantasia || company?.name}`, 14, 28)
        doc.text(`CNPJ: ${company?.cnpj || "---"}`, 14, 34)
        doc.text(`Período: ${mes}/${ano}`, 14, 40)

        let y = 48
        for (const [funcId, regs] of Object.entries(registrosPorFunc)) {
          if (y > 250) { doc.addPage(); y = 20 }
          const func = funcMap.get(funcId)
          const horas = calcularHorasTrabalhadas(regs)
          doc.setFontSize(12)
          doc.text(`Mat. ${func?.matricula} - ${func?.nome}`, 14, y)
          doc.setFontSize(10)
          doc.text(`Total: ${horas}h | Registros: ${regs.length}`, 14, y + 6)
          y += 14

          const regsPorDia: Record<string, RegistroPonto[]> = {}
          for (const r of regs) {
            if (!regsPorDia[r.data]) regsPorDia[r.data] = []
            regsPorDia[r.data].push(r)
          }

          for (const [dia, diaRegs] of Object.entries(regsPorDia)) {
            if (y > 270) { doc.addPage(); y = 20 }
            const linha = diaRegs.map(r => formatarTempoRegistro(r.data_hora)).join(" | ")
            doc.setFontSize(8)
            doc.text(`${new Date(dia + 'T12:00:00').toLocaleDateString('pt-BR')}: ${linha}`, 20, y)
            y += 5
          }
          y += 6
        }

        doc.save(`relatorio_ponto_${mes}_${ano}.pdf`)
        toast.success("PDF gerado com sucesso!")
      } else {
        let csv = "Funcionario,Matricula,Data,Tipo,Horario\n"
        for (const [funcId, regs] of Object.entries(registrosPorFunc)) {
          const func = funcMap.get(funcId)
          for (const r of regs) {
            csv += `"${func?.nome}","${func?.matricula}","${r.data}","${r.tipo}","${formatarTempoRegistro(r.data_hora)}"\n`
          }
        }
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `relatorio_ponto_${mes}_${ano}.csv`
        a.click()
        URL.revokeObjectURL(url)
        toast.success("CSV gerado com sucesso!")
      }
    } catch (err: any) {
      toast.error("Erro ao gerar relatório: " + err.message)
    } finally {
      setLoading(false)
    }
  }

  const gerarEspelhoPontoIndividual = async () => {
    if (!company?.id) return
    if (funcionarioId === "all") {
      toast.error("Selecione um funcionário específico para o espelho de ponto")
      return
    }
    setLoading(true)
    try {
      const mesNum = parseInt(mes)
      const anoNum = parseInt(ano)
      const registros = await obterRegistrosPorMes(funcionarioId, mesNum, anoNum)
      const func = funcionarios.find(f => f.id === funcionarioId)
      if (!func) throw new Error("Funcionário não encontrado")

      const { default: jsPDF } = await import('jspdf')
      await import('jspdf-autotable')

      const doc = new jsPDF('P', 'mm', 'A4')

      const dia1 = new Date(anoNum, mesNum - 1, 1)
      const diaFim = new Date(anoNum, mesNum, 0)
      const diasNoMes = diaFim.getDate()

      doc.setFontSize(10)
      doc.text("ESPELHO DE PONTO", 105, 15, { align: "center" })
      doc.setFontSize(8)
      doc.text(`Portaria MTP 671/2021 - REP-A`, 105, 20, { align: "center" })

      doc.setFontSize(9)
      const cabecalho = [
        `Empresa: ${company?.nome_fantasia || company?.name}`,
        `CNPJ: ${company?.cnpj || "( informar )"}`,
        `Funcionário: ${func.nome}`,
        `Matrícula: ${func.matricula} | CPF: ${func.cpf || "( informar )"} | Cargo: ${func.cargo || "( informar )"}`,
        `Período: ${dia1.toLocaleDateString('pt-BR')} a ${diaFim.toLocaleDateString('pt-BR')}`,
      ]
      cabecalho.forEach((linha, i) => doc.text(linha, 14, 28 + i * 4.5))

      const registrosPorDia: Record<string, RegistroPonto[]> = {}
      for (const r of registros) {
        if (!registrosPorDia[r.data]) registrosPorDia[r.data] = []
        registrosPorDia[r.data].push(r)
      }

      const tabela: any[][] = []
      let totalHoras = 0
      let totalExtras = 0
      let totalDebito = 0

      for (let d = 1; d <= diasNoMes; d++) {
        const dataStr = `${anoNum}-${String(mesNum).padStart(2, '0')}-${String(d).padStart(2, '0')}`
        const diaSemana = new Date(anoNum, mesNum - 1, d).toLocaleDateString('pt-BR', { weekday: 'short' })
        const regs = registrosPorDia[dataStr] || []

        const entrada = regs.find(r => r.tipo === 'entrada')
        const saidaAlmoco = regs.find(r => r.tipo === 'saida_almoco')
        const retornoAlmoco = regs.find(r => r.tipo === 'retorno_almoco')
        const saida = regs.find(r => r.tipo === 'saida')

        if (regs.length === 0) {
          const dd = String(d).padStart(2, '0')
          const mm = String(mesNum).padStart(2, '0')
          tabela.push([`${dd}/${mm}`, diaSemana, '---', '---', '---', '---', 'FALTA', '0:00', '0:00', '0:00'])
        } else {
          const horas = calcularHorasTrabalhadas(regs)
          const [h, m] = horas.split(':').map(Number)
          const totalMin = h * 60 + m
          const prevMin = 8 * 60
          const saldoMin = totalMin - prevMin
          const saldoStr = `${saldoMin >= 0 ? '+' : ''}${Math.floor(Math.abs(saldoMin) / 60)}:${String(Math.abs(saldoMin) % 60).padStart(2, '0')}`
          const extraStr = saldoMin > 0 ? saldoStr : '0:00'
          const debStr = saldoMin < 0 ? saldoStr : '0:00'

          totalHoras += totalMin
          if (saldoMin > 0) totalExtras += saldoMin
          if (saldoMin < 0) totalDebito += Math.abs(saldoMin)

          const dd = String(d).padStart(2, '0')
          const mm = String(mesNum).padStart(2, '0')
          tabela.push([
            `${dd}/${mm}`,
            diaSemana,
            entrada ? formatarTempoRegistro(entrada.data_hora) : '---',
            saidaAlmoco ? formatarTempoRegistro(saidaAlmoco.data_hora) : '---',
            retornoAlmoco ? formatarTempoRegistro(retornoAlmoco.data_hora) : '---',
            saida ? formatarTempoRegistro(saida.data_hora) : '---',
            '',
            horas,
            extraStr,
            debStr,
          ])
        }
      }

      ;(doc as any).autoTable({
        startY: 50,
        head: [['Data', 'Dia', 'Entrada', 'S.Almoço', 'R.Almoço', 'Saída', 'Obs', 'Trab.', 'Extra', 'Débito']],
        body: tabela,
        styles: { fontSize: 6, cellPadding: 1.5 },
        headStyles: { fillColor: [22, 163, 74], fontSize: 6 },
        columnStyles: {
          0: { cellWidth: 14 },
          1: { cellWidth: 12 },
          2: { cellWidth: 14 },
          3: { cellWidth: 14 },
          4: { cellWidth: 14 },
          5: { cellWidth: 14 },
          6: { cellWidth: 14 },
          7: { cellWidth: 14 },
          8: { cellWidth: 14 },
          9: { cellWidth: 14 },
        },
      })

      const finalY = (doc as any).lastAutoTable.finalY + 8

      doc.setFontSize(9)
      const totalHorasFinal = `${Math.floor(totalHoras / 60)}:${String(totalHoras % 60).padStart(2, '0')}`
      doc.text(`Totais do mês:`, 14, finalY)
      doc.text(`Horas trabalhadas: ${totalHorasFinal}h`, 14, finalY + 5)
      doc.text(`Horas extras: ${Math.floor(totalExtras / 60)}:${String(totalExtras % 60).padStart(2, '0')}h`, 14, finalY + 10)
      doc.text(`Horas débito: ${Math.floor(totalDebito / 60)}:${String(totalDebito % 60).padStart(2, '0')}h`, 14, finalY + 15)

      doc.text("Declaro que as marcações acima refletem minha jornada real.", 105, finalY + 25, { align: "center" })
      doc.text("________________________________", 105, finalY + 35, { align: "center" })
      doc.text("Assinatura do Funcionário", 105, finalY + 40, { align: "center" })
      doc.text("________________________________", 105, finalY + 50, { align: "center" })
      doc.text("Assinatura do RH / Empresa", 105, finalY + 55, { align: "center" })

      doc.setFontSize(6)
      doc.text(`Documento gerado em ${new Date().toLocaleString('pt-BR')} - Ponto Digital BM v1.0 - Hash de integridade disponível`, 105, 285, { align: "center" })

      doc.save(`espelho_ponto_${func.matricula}_${mes}_${ano}.pdf`)
      toast.success("Espelho de ponto gerado com sucesso!")
    } catch (err: any) {
      toast.error("Erro ao gerar espelho: " + err.message)
    } finally {
      setLoading(false)
    }
  }

  const gerarAFD = async () => {
    if (!company?.id) return
    setLoading(true)
    try {
      const mesNum = parseInt(mes)
      const anoNum = parseInt(ano)
      const { registrosPorFunc, funcMap } = await carregarRegistros()
      const dataAtual = new Date()
      const dataStr = `${String(dataAtual.getDate()).padStart(2, '0')}${String(dataAtual.getMonth() + 1).padStart(2, '0')}${dataAtual.getFullYear()}`
      const horaStr = `${String(dataAtual.getHours()).padStart(2, '0')}${String(dataAtual.getMinutes()).padStart(2, '0')}${String(dataAtual.getSeconds()).padStart(2, '0')}`

      let afd = `"

AFD - ARQUIVO FONTE DE DADOS
Portaria MTP 671/2021 - REP-A (Registrador Eletrônico de Ponto Alternativo)
Empresa: ${company?.nome_fantasia || company?.name}
CNPJ: ${company?.cnpj || "( informar )"}
Período: ${mes}/${ano}
Gerado em: ${dataAtual.toLocaleString('pt-BR')}
Sistema: Ponto Digital BM v1.0
${'='.repeat(80)}

`

      afd += `TIPO;NSR;DATA;HORA;PIS/NRP;MATRICULA;NOME;TIPO_MARCACAO;FONTE\n`
      let nsr = 1

      const totalRegistros = Object.entries(registrosPorFunc).reduce((s, [, regs]) => s + regs.length, 0)
      afd += `;HEADER;${dataStr};${horaStr};;;;;;;;;;${company?.cnpj || ""};;${company?.nome_fantasia || company?.name};;PONTO DIGITAL BM;1.0;${totalRegistros}\n`

      for (const [funcId, regs] of Object.entries(registrosPorFunc)) {
        const func = funcMap.get(funcId)
        if (!func) continue

        afd += `;FUNC;${func.matricula};;${func.nome};;;${func.cpf || ""};;;;${func.setor || ""};;${func.cargo || ""}\n`

        const sorted = [...regs].sort((a, b) =>
          new Date(a.data_hora).getTime() - new Date(b.data_hora).getTime()
        )

        for (const r of sorted) {
          const d = new Date(r.data_hora)
          const dataReg = `${String(d.getDate()).padStart(2, '0')}${String(d.getMonth() + 1).padStart(2, '0')}${d.getFullYear()}`
          const horaReg = `${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}${String(d.getSeconds()).padStart(2, '0')}`

          const tipoMap: Record<string, string> = {
            entrada: 'E',
            saida_almoco: 'SA',
            retorno_almoco: 'RA',
            saida: 'S',
            extra_inicio: 'EI',
            extra_fim: 'EF',
          }

          afd += `${String(nsr).padStart(9, '0')};${dataReg};${horaReg};${func.cpf || ""};${func.matricula};${func.nome};${tipoMap[r.tipo] || r.tipo};${r.hash_integridade || ""};${r.latitude || ""};${r.longitude || ""};${r.selfie_url || ""};${r.dispositivo_info || ""};${r.created_at}\n`
          nsr++
        }
      }

      afd += `
${'='.repeat(80)}
TOTAL DE REGISTROS: ${nsr - 1}
TOTAL DE FUNCIONARIOS: ${Object.keys(registrosPorFunc).length}
HASH GERAL: ${await gerarHashGeral(afd)}
`

      const blob = new Blob([afd], { type: 'text/plain;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `AFD_${company?.cnpj || "000000"}_${mes}_${ano}.txt`
      a.click()
      URL.revokeObjectURL(url)
      toast.success(`AFD gerado com ${nsr - 1} registros!`)
    } catch (err: any) {
      toast.error("Erro ao gerar AFD: " + err.message)
    } finally {
      setLoading(false)
    }
  }

  const gerarAEJ = async () => {
    if (!company?.id) return
    setLoading(true)
    try {
      const mesNum = parseInt(mes)
      const anoNum = parseInt(ano)
      const { registrosPorFunc, funcMap } = await carregarRegistros()

      const funcionariosAEJ: any[] = []

      for (const [funcId, regs] of Object.entries(registrosPorFunc)) {
        const func = funcMap.get(funcId)
        if (!func) continue

        const registrosPorDia: Record<string, any[]> = {}
        for (const r of regs) {
          if (!registrosPorDia[r.data]) registrosPorDia[r.data] = []
          registrosPorDia[r.data].push({
            tipo: r.tipo,
            dataHora: r.data_hora,
            horario: formatarTempoRegistro(r.data_hora),
            hash: r.hash_integridade,
            latitude: r.latitude,
            longitude: r.longitude,
            selfie: r.selfie_url,
            origem: r.dispositivo_info || 'web',
          })
        }

        const jornadas: any[] = []
        for (const [dia, diaRegs] of Object.entries(registrosPorDia)) {
          const horas = calcularHorasTrabalhadas(regs.filter(r => r.data === dia))
          jornadas.push({
            data: dia,
            marcacoes: diaRegs,
            totalHoras: horas,
          })
        }

        funcionariosAEJ.push({
          matricula: func.matricula,
          nome: func.nome,
          cpf: func.cpf,
          cargo: func.cargo,
          setor: func.setor,
          jornadas,
        })
      }

      const aej = {
        versao: "1.0",
        sistema: "Ponto Digital BM",
        dataGeracao: new Date().toISOString(),
        portaria: "MTP 671/2021",
        tipoSistema: "REP-A",
        empresa: {
          nome: company?.nome_fantasia || company?.name,
          cnpj: company?.cnpj || "",
          razaoSocial: company?.razao_social || "",
        },
        periodo: { mes: mesNum, ano: anoNum },
        totalFuncionarios: funcionariosAEJ.length,
        totalRegistros: Object.values(registrosPorFunc).reduce((s, r) => s + r.length, 0),
        funcionarios: funcionariosAEJ,
      }

      const jsonStr = JSON.stringify(aej, null, 2)
      const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `AEJ_${company?.cnpj || "000000"}_${mes}_${ano}.json`
      a.click()
      URL.revokeObjectURL(url)
      toast.success(`AEJ gerado com ${funcionariosAEJ.length} funcionários!`)
    } catch (err: any) {
      toast.error("Erro ao gerar AEJ: " + err.message)
    } finally {
      setLoading(false)
    }
  }

  const gerarHashGeral = async (conteudo: string): Promise<string> => {
    const encoder = new TextEncoder()
    const data = encoder.encode(conteudo)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Relatórios</h1>
        <p className="text-muted-foreground">Exporte relatórios de ponto e arquivos fiscais</p>
      </div>

      <div className="grid md:grid-cols-4 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Funcionário</label>
          <Select value={funcionarioId} onValueChange={setFuncionarioId}>
            <SelectTrigger>
              <SelectValue placeholder="Todos os funcionários" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os funcionários</SelectItem>
              {funcionarios.map((f) => (
                <SelectItem key={f.id} value={f.id}>
                  {f.matricula} - {f.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Mês</label>
          <Select value={mes} onValueChange={setMes}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <SelectItem key={m} value={m.toString()}>
                  {new Date(2000, m - 1).toLocaleDateString('pt-BR', { month: 'long' })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Ano</label>
          <Select value={ano} onValueChange={setAno}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[2024, 2025, 2026, 2027].map((a) => (
                <SelectItem key={a} value={a.toString()}>{a}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-end">
          <Button
            variant="outline"
            className="w-full h-10"
            onClick={() => { setFuncionarioId("all"); setMes(String(new Date().getMonth() + 1)); setAno(String(new Date().getFullYear())) }}
          >
            Mês Atual
          </Button>
        </div>
      </div>

      <Tabs defaultValue="fiscais">
        <TabsList className="w-full grid grid-cols-4">
          <TabsTrigger value="fiscais" className="gap-2">
            <Scale className="w-4 h-4" />
            Fiscais (Portaria 671)
          </TabsTrigger>
          <TabsTrigger value="espelho" className="gap-2">
            <FileText className="w-4 h-4" />
            Espelho de Ponto
          </TabsTrigger>
          <TabsTrigger value="exportar" className="gap-2">
            <Download className="w-4 h-4" />
            Exportar
          </TabsTrigger>
          <TabsTrigger value="resumo" className="gap-2">
            <FileSpreadsheet className="w-4 h-4" />
            Resumo
          </TabsTrigger>
        </TabsList>

        <TabsContent value="fiscais" className="mt-6">
          <Card className="p-6 border-2 border-amber-200 bg-amber-50/50">
            <div className="flex items-start gap-4 mb-6">
              <div className="p-3 rounded-xl bg-amber-100">
                <Scale className="w-8 h-8 text-amber-700" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-amber-900">Arquivos Fiscais - Portaria MTP 671/2021</h2>
                <p className="text-sm text-amber-700 mt-1">
                  Geração de arquivos obrigatórios para fiscalização trabalhista.
                  Conforme exigências do Ministério do Trabalho e Emprego para sistemas REP-A.
                </p>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <Card className="p-5 bg-white border-2 border-amber-100 hover:border-amber-300 transition-colors">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-bold text-base">AFD</h3>
                    <p className="text-xs text-muted-foreground">Arquivo Fonte de Dados</p>
                  </div>
                  <FileCode className="w-8 h-8 text-amber-600" />
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  Arquivo texto completo com todos os registros de ponto, funcionários e
                  eventos do sistema. Formato exigido pelo MTE para auditoria fiscal.
                </p>
                <ul className="text-xs text-muted-foreground space-y-1 mb-4">
                  <li>✓ Todos os funcionários do período</li>
                  <li>✓ Registros com hash de integridade</li>
                  <li>✓ Geolocalização das marcações</li>
                  <li>✓ Totalização e hash geral</li>
                </ul>
                <Button
                  className="w-full bg-amber-600 hover:bg-amber-700"
                  onClick={gerarAFD}
                  disabled={loading}
                >
                  <Download className="w-4 h-4 mr-2" />
                  {loading ? "Gerando..." : "Gerar AFD (.txt)"}
                </Button>
              </Card>

              <Card className="p-5 bg-white border-2 border-amber-100 hover:border-amber-300 transition-colors">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-bold text-base">AEJ</h3>
                    <p className="text-xs text-muted-foreground">Arquivo Eletrônico de Jornada</p>
                  </div>
                  <FileJson className="w-8 h-8 text-amber-600" />
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  Arquivo JSON estruturado com a jornada completa de cada funcionário.
                  Formato digital para análise fiscal e importação em sistemas de auditoria.
                </p>
                <ul className="text-xs text-muted-foreground space-y-1 mb-4">
                  <li>✓ Jornada diária por funcionário</li>
                  <li>✓ Marcações completas com hash</li>
                  <li>✓ Totais e saldos calculados</li>
                  <li>✓ Metadados do sistema e portaria</li>
                </ul>
                <Button
                  className="w-full bg-amber-600 hover:bg-amber-700"
                  onClick={gerarAEJ}
                  disabled={loading}
                >
                  <Download className="w-4 h-4 mr-2" />
                  {loading ? "Gerando..." : "Gerar AEJ (.json)"}
                </Button>
              </Card>

              <Card className="p-5 bg-white border-2 border-red-100 hover:border-red-300 transition-colors">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-bold text-base">Espelho Mensal</h3>
                    <p className="text-xs text-muted-foreground">Individual por funcionário</p>
                  </div>
                  <FileText className="w-8 h-8 text-red-600" />
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  Espelho de ponto mensal individual completo para assinatura.
                  Documento obrigatório para validação da jornada do funcionário.
                </p>
                <ul className="text-xs text-muted-foreground space-y-1 mb-4">
                  <li>✓ Todas as marcações do mês</li>
                  <li>✓ Totais de horas trabalhadas</li>
                  <li>✓ Campo de assinatura funcionário/RH</li>
                  <li>✓ Referência à Portaria 671/2021</li>
                </ul>
                <Button
                  className="w-full"
                  onClick={gerarEspelhoPontoIndividual}
                  disabled={loading || funcionarioId === "all"}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  {funcionarioId === "all"
                    ? "Selecione um funcionário"
                    : loading ? "Gerando..." : "Gerar Espelho PDF"}
                </Button>
              </Card>
            </div>

            <div className="mt-6 p-4 rounded-lg bg-amber-100/50 border border-amber-200">
              <p className="text-sm font-medium text-amber-800 flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Conformidade Portaria 671/2021
              </p>
              <ul className="text-xs text-amber-700 mt-2 space-y-1 ml-6 list-disc">
                <li>Registros com hash SHA256 - impedem adulteração retroativa</li>
                <li>Auditoria completa de todas as operações</li>
                <li>Logs imutáveis com timestamp do servidor</li>
                <li>Espelho de ponto mensal para assinatura</li>
                <li>Arquivo AFD disponível para fiscalização</li>
                <li>Armazenamento mínimo obrigatório de 5 anos</li>
              </ul>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="espelho" className="mt-6">
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-2">Espelho de Ponto Mensal</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Gere o espelho de ponto individual em PDF para impressão e assinatura.
              Necessário selecionar um funcionário específico.
            </p>

            <div className="grid md:grid-cols-2 gap-4">
              <Card className="p-4 bg-muted/50">
                <h3 className="font-medium text-sm mb-1">Espelho Individual</h3>
                <p className="text-xs text-muted-foreground mb-3">
                  Documento completo com todas as marcações, totais e campos para assinatura
                </p>
                <Button
                  onClick={gerarEspelhoPontoIndividual}
                  disabled={loading || funcionarioId === "all"}
                  className="w-full"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  {funcionarioId === "all" ? "Selecione um funcionário" : "Gerar PDF"}
                </Button>
              </Card>

              <Card className="p-4 bg-muted/50">
                <h3 className="font-medium text-sm mb-1">Lote (todos)</h3>
                <p className="text-xs text-muted-foreground mb-3">
                  Gera espelhos individuais para todos os funcionários ativos em lote
                </p>
                <Button
                  variant="outline"
                  className="w-full"
                  disabled={loading}
                  onClick={async () => {
                    if (!company?.id) return
                    setLoading(true)
                    try {
                      const funcs = await supabase
                        .from("funcionarios")
                        .select("id")
                        .eq("empresa_id", company.id)
                        .eq("ativo", true)
                      const ids = funcs.data?.map(f => f.id) || []
                      toast.info(`Gerando espelhos para ${ids.length} funcionários...`)
                      for (const id of ids) {
                        setFuncionarioId(id)
                        await gerarEspelhoPontoIndividual()
                      }
                      setFuncionarioId("all")
                      toast.success(`${ids.length} espelhos gerados!`)
                    } catch (err: any) {
                      toast.error("Erro no lote: " + err.message)
                    } finally {
                      setLoading(false)
                    }
                  }}
                >
                  {loading ? "Gerando..." : "Gerar Lote"}
                </Button>
              </Card>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="exportar" className="mt-6">
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-2">Exportar Relatórios</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Exporte os registros de ponto em formato PDF ou CSV
            </p>
            <div className="flex flex-wrap gap-4">
              <Button onClick={() => gerarRelatorioComum('pdf')} disabled={loading}>
                <FileText className="w-4 h-4 mr-2" />
                PDF
              </Button>
              <Button variant="outline" onClick={() => gerarRelatorioComum('csv')} disabled={loading}>
                <Download className="w-4 h-4 mr-2" />
                CSV
              </Button>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="resumo" className="mt-6">
          <div className="grid md:grid-cols-4 gap-4">
            <Card className="p-4 text-center">
              <Users className="w-8 h-8 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold">{funcionarios.length}</p>
              <p className="text-sm text-muted-foreground">Funcionários ativos</p>
            </Card>
            <Card className="p-4 text-center">
              <Calendar className="w-8 h-8 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold">{mes}/{ano}</p>
              <p className="text-sm text-muted-foreground">Período selecionado</p>
            </Card>
            <Card className="p-4 text-center">
              <Shield className="w-8 h-8 mx-auto mb-2 text-amber-600" />
              <p className="text-2xl font-bold">Portaria 671</p>
              <p className="text-sm text-muted-foreground">Relatórios fiscais</p>
            </Card>
            <Card className="p-4 text-center">
              <Printer className="w-8 h-8 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold">5 formatos</p>
              <p className="text-sm text-muted-foreground">PDF, CSV, AFD, AEJ, JSON</p>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default AdminReports
