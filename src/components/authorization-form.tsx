"use client";

import React, { useState, useRef, useEffect } from "react";
import { useForm, Controller, SubmitHandler, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

// Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipProvider,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";

// Utils and Types
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import {
  authorizationSchema,
  AuthorizationFormData,
  storeOptionsList,
  documentTypeOptionsBuyer,
  documentTypeOptionsRepresentative,
} from "@/lib/schemas";

// Icons
import {
  CalendarIcon,
  HelpCircle,
  Mail,
  Download,
  Loader2,
  ExternalLink,
  ShieldAlert,
  FileCheck2,
  UserCheck,
  ShoppingBag,
  AlertTriangle,
  UserRound,
  CheckCircle2,
} from "lucide-react";

// ============================================================================
// CONSTANTS
// ============================================================================

const PICKUP_ADDRESS =
  "Avenida Vicente de Carvalho, 909 - Vicente de Carvalho - Rio de Janeiro - RJ - 21211-007 - pickup";

// ============================================================================
// UTILITIES
// ============================================================================

const formatPhone = (value: string) => {
  if (!value) return "";
  const cleaned = value.replace(/\D/g, "");
  if (cleaned.length <= 2) return `(${cleaned}`;
  if (cleaned.length <= 6) return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2)}`;
  if (cleaned.length <= 10)
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
  return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7, 11)}`;
};

const formatCPF = (value: string) => {
  if (!value) return "";
  const cleaned = value.replace(/\D/g, "");
  if (cleaned.length <= 3) return cleaned;
  if (cleaned.length <= 6) return `${cleaned.slice(0, 3)}.${cleaned.slice(3)}`;
  if (cleaned.length <= 9)
    return `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6)}`;
  return `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6, 9)}-${cleaned.slice(9, 11)}`;
};

const formatCNPJ = (value: string) => {
  if (!value) return "";
  const cleaned = value.replace(/\D/g, "");
  if (cleaned.length <= 2) return cleaned;
  if (cleaned.length <= 5) return `${cleaned.slice(0, 2)}.${cleaned.slice(2)}`;
  if (cleaned.length <= 8)
    return `${cleaned.slice(0, 2)}.${cleaned.slice(2, 5)}.${cleaned.slice(5)}`;
  if (cleaned.length <= 12)
    return `${cleaned.slice(0, 2)}.${cleaned.slice(2, 5)}.${cleaned.slice(5, 8)}/${cleaned.slice(8)}`;
  return `${cleaned.slice(0, 2)}.${cleaned.slice(2, 5)}.${cleaned.slice(5, 8)}/${cleaned.slice(8, 12)}-${cleaned.slice(12, 14)}`;
};

const formatCurrency = (value: string) => {
  if (!value) return "";
  let cleaned = value.replace(/\D/g, "");
  if (!cleaned) return "";
  cleaned = (parseInt(cleaned, 10) / 100).toFixed(2);
  return cleaned.replace(".", ",");
};

const formatRG = (value: string) => {
  if (!value) return "";
  return value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
};

const formatCEP = (value: string) => {
  if (!value) return "";
  return value.replace(/\D/g, "").replace(/^(\d{5})(\d)/, "$1-$2").slice(0, 9);
};

// ============================================================================
// MODAL COMPONENTS
// ============================================================================

interface InitialModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onContinue: () => void;
}

const InitialModal: React.FC<InitialModalProps> = ({
  open,
  onOpenChange,
  onContinue,
}) => {
  const [agreed, setAgreed] = useState(false);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-2xl font-bold text-center">
            Autorização para Retirada por Terceiros
          </AlertDialogTitle>
          <div className="space-y-4 pt-4">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-800">
                Este é um formulário auxiliar para facilitar o preenchimento da autorização.
                As regras oficiais da modalidade "Retira em Loja" permanecem válidas.
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold">Documentos necessários:</h3>
              <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground">
                <li>Documento oficial com foto do representante (original)</li>
                <li>Este termo assinado (digital ou impresso)</li>
                <li>Cópia do documento do comprador (foto ou digitalização)</li>
                <li>Para PJ: Contrato Social ou Estatuto</li>
              </ul>
            </div>

            <div className="bg-muted p-4 rounded-lg space-y-3">
              <p className="text-sm font-medium">Links úteis:</p>
              <div className="flex flex-col sm:flex-row gap-3">
                <a
                  href="https://www.rihappy.com.br/retira-em-loja"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-primary hover:underline"
                >
                  <ExternalLink className="h-4 w-4" />
                  Regulamento oficial
                </a>
                <a
                  href="https://files.directtalk.com.br/1.0/api/file/public/4c70e9a0-3b7c-4097-8b2f-082157e66860/content-inline"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-primary hover:underline"
                >
                  <ExternalLink className="h-4 w-4" />
                  Modelo oficial para impressão
                </a>
              </div>
            </div>
          </div>
        </AlertDialogHeader>

        <div className="flex items-center space-x-2 py-4">
          <Checkbox
            id="modal-agree"
            checked={agreed}
            onCheckedChange={(checked) => setAgreed(checked as boolean)}
          />
          <Label htmlFor="modal-agree" className="text-sm">
            Li e compreendi as informações acima
          </Label>
        </div>

        <AlertDialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={onContinue} disabled={!agreed}>
            Continuar para o formulário
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

interface DateWarningModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DateWarningModal: React.FC<DateWarningModalProps> = ({
  open,
  onOpenChange,
}) => (
  <AlertDialog open={open} onOpenChange={onOpenChange}>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle className="flex items-center gap-2 text-yellow-600">
          <AlertTriangle className="h-6 w-6" />
          Atenção sobre a Data de Retirada
        </AlertDialogTitle>
        <div className="space-y-3 pt-4">
          <p>A data selecionada é superior a 15 dias da data da compra.</p>
          <p className="text-sm text-muted-foreground">
            Conforme nossa política, pedidos não retirados em até 15 dias corridos
            podem ser cancelados automaticamente.
          </p>
        </div>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogAction>Entendi</AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);

// ============================================================================
// PDF TEMPLATE COMPONENT
// ============================================================================
interface PdfTemplateProps {
  pdfTemplateRef: React.RefObject<HTMLDivElement>;
  generationTimestamp: string | null;
  form: any; // React Hook Form's form object
  signatureDataUrl?: string | null;
}

const AuthorizationPdfTemplate: React.FC<PdfTemplateProps> = ({
  pdfTemplateRef,
  generationTimestamp,
  form,
  signatureDataUrl,
}) => {
  const data = form.getValues() as AuthorizationFormData;
  const store = storeOptionsList.find(s => s.value === data.pickupStore) || storeOptionsList[0];
  
  const currentDate = format(new Date(), "d 'de' MMMM 'de' yyyy", { locale: ptBR });
  
  const formattedPurchaseDate = data.purchaseDate 
    ? format(new Date(data.purchaseDate), "dd/MM/yyyy") 
    : '';

  return (
    <div
      ref={pdfTemplateRef}
      className="hidden"
      style={{
        position: 'fixed',
        left: '-400mm',
        top: 0,
        width: '210mm',
        height: '297mm',
        backgroundColor: '#fff',
        overflow: 'hidden',
      }}
    >
      <div 
        className="bg-white p-[15mm] text-gray-900 leading-normal"
        style={{ 
          width: '210mm', 
          height: '297mm',
          fontSize: '10pt',
          fontFamily: 'Inter, sans-serif'
        }}
      >
        <div className="text-center mb-6">
          <h1 className="text-xl font-bold uppercase tracking-wide">TERMO DE AUTORIZAÇÃO PARA RETIRADA POR TERCEIRO</h1>
        </div>

        {/* COMPRADOR Section */}
        <div className="border border-gray-300 mb-6 rounded-sm overflow-hidden">
          <div className="bg-gray-100 px-3 py-2 border-b border-gray-300">
            <h2 className="font-bold uppercase text-[10pt]">COMPRADOR (TITULAR DO PEDIDO)</h2>
          </div>
          <div className="grid grid-cols-12 text-[10pt]">
            <div className="col-span-3 px-3 py-3 font-semibold border-b border-r border-gray-300">Nome/Razão Social:</div>
            <div className="col-span-9 px-3 py-3 border-b border-gray-300">{data.buyerName}</div>

            <div className="col-span-3 px-3 py-3 font-semibold border-b border-r border-gray-300">RG:</div>
            <div className="col-span-9 px-3 py-3 border-b border-gray-300">{data.buyerDocumentType === 'RG' ? data.buyerDocumentNumber : '-'}</div>

            <div className="col-span-3 px-3 py-3 font-semibold border-b border-r border-gray-300">CPF/CNPJ:</div>
            <div className="col-span-9 px-3 py-3 border-b border-gray-300">{data.buyerCPF || data.buyerCNPJ}</div>

            <div className="col-span-3 px-3 py-3 font-semibold border-b border-r border-gray-300">Endereço:</div>
            <div className="col-span-9 px-3 py-3 border-b border-gray-300">
              {data.buyerStreet}, {data.buyerNumber}{data.buyerComplement ? ` - ${data.buyerComplement}` : ''}
            </div>

            <div className="col-span-3 px-3 py-3 font-semibold border-r border-gray-300">Município:</div>
            <div className="col-span-6 px-3 py-3 border-r border-gray-300">{data.buyerCity}</div>
            <div className="col-span-1 px-3 py-3 font-semibold border-r border-gray-300">UF:</div>
            <div className="col-span-2 px-3 py-3 uppercase">{data.buyerState}</div>
          </div>
        </div>

        {/* REPRESENTANTE Section */}
        <div className="border border-gray-300 mb-6 rounded-sm overflow-hidden">
          <div className="bg-gray-100 px-3 py-2 border-b border-gray-300">
            <h2 className="font-bold uppercase text-[10pt]">REPRESENTANTE AUTORIZADO</h2>
          </div>
          <div className="grid grid-cols-12 text-[10pt]">
            <div className="col-span-3 px-3 py-3 font-semibold border-b border-r border-gray-300">Nome/Razão Social:</div>
            <div className="col-span-9 px-3 py-3 border-b border-gray-300">{data.representativeName}</div>

            <div className="col-span-3 px-3 py-3 font-semibold border-b border-r border-gray-300">RG:</div>
            <div className="col-span-9 px-3 py-3 border-b border-gray-300">{data.representativeDocumentType === 'RG' ? data.representativeDocumentNumber : '-'}</div>

            <div className="col-span-3 px-3 py-3 font-semibold border-r border-gray-300">CPF:</div>
            <div className="col-span-9 px-3 py-3">{data.representativeDocumentType === 'CPF' ? data.representativeDocumentNumber : '-'}</div>
          </div>
        </div>

        {/* Instructional Text */}
        <div className="space-y-4 text-[10pt] mb-6 text-justify px-1">
          <p>
            O COMPRADOR autoriza seu REPRESENTANTE, acima identificado, a retirar os produtos listados no Pedido, cujas informações estão detalhadas no quadro abaixo, na loja física escolhida pelo COMPRADOR no momento da realização de sua compra no site.
          </p>
          <p>
            Para retirada dos produtos, o REPRESENTANTE deverá ser maior de 18 anos, estar munido de documento oficial com foto e deste termo devidamente assinado eletronicamente pelo COMPRADOR e uma cópia (foto/imagem) do documento de identidade oficial do COMPRADOR.
          </p>
          <p>
            Sendo o COMPRADOR pessoa jurídica, uma foto ou cópia (imagem legível) do Contrato Social / Estatuto Social da empresa do COMPRADOR deverá ser apresentada. (*)
          </p>
        </div>

        {/* Table Section */}
        <div className="border border-gray-400 rounded-sm overflow-hidden mb-8">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-100 border-b border-gray-400">
                <th className="px-3 py-2 border-r border-gray-400 font-bold text-center w-24">Data da Compra</th>
                <th className="px-3 py-2 border-r border-gray-400 font-bold text-center w-24">Valor (R$)</th>
                <th className="px-3 py-2 border-r border-gray-400 font-bold text-center w-32">Nº do Pedido</th>
                <th className="px-3 py-2 font-bold text-center">
                  {data.buyerCity}, {currentDate}<br/>
                  Loja para Retirada
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="px-3 py-4 border-r border-gray-400 text-center">{formattedPurchaseDate}</td>
                <td className="px-3 py-4 border-r border-gray-400 text-center">R$ {data.purchaseValue}</td>
                <td className="px-3 py-4 border-r border-gray-400 text-center uppercase">V{data.orderNumber}RIHP-01</td>
                <td className="px-4 py-4 text-left text-[9pt]">
                  {PICKUP_ADDRESS}
                </td>
              </tr>
              <tr className="border-t border-gray-400">
                <td colSpan={4} className="px-3 py-6 text-center">
                  <div className="italic text-gray-600 mb-6">
                    Assinatura eletrônica registrada em: {generationTimestamp}
                  </div>
                  <div className="mt-8">
                    <div className="font-bold uppercase">{data.buyerName}</div>
                    <div className="uppercase">
                      {data.buyerDocumentType === 'RG' ? `RG nº ${data.buyerDocumentNumber || '-'}` : (data.buyerCPF || data.buyerCNPJ || '')}
                    </div>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="text-[9pt] italic">
          (*) Os documentos mencionados não serão retidos em loja. Após conferência, serão devolvidos ao representante.
        </div>
      </div>
    </div>
  );
};


// ============================================================================
// MAIN FORM COMPONENT
// ============================================================================

export const AuthorizationForm: React.FC = () => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showInitialModal, setShowInitialModal] = useState(false);
  const [showDateWarningModal, setShowDateWarningModal] = useState(false);
  const [showPostPdfModal, setShowPostPdfModal] = useState(false);
  const [isCepLoading, setIsCepLoading] = useState(false);
  const [generationTimestamp, setGenerationTimestamp] = useState<string | null>(null);
  const pdfTemplateRef = useRef<HTMLDivElement>(null);

  // Form initialization
  const form = useForm<AuthorizationFormData>({
    resolver: zodResolver(authorizationSchema),
    defaultValues: {
      buyerType: "individual",
      buyerName: "",
      buyerEmail: "",
      buyerPhone: "",
      buyerCPF: "",
      buyerCNPJ: "",
      buyerCEP: "",
      buyerStreet: "",
      buyerNumber: "",
      buyerComplement: "",
      buyerDistrict: "",
      buyerCity: "",
      buyerState: "",
      representativeName: "",
      representativeDocumentType: undefined,
      representativeDocumentNumber: "",
      purchaseValue: "",
      orderNumber: "",
      pickupStore: "1187 - CARIOCA SHOPPING",
      agreedToTerms: false,
      agreedToRequirements: false,
    },
    mode: "onBlur",
  });

  const buyerType = form.watch("buyerType");
  const agreedToTerms = form.watch("agreedToTerms");
  const agreedToRequirements = form.watch("agreedToRequirements");
  const repDocType = useWatch({ control: form.control, name: "representativeDocumentType" });

  // Check if user has seen the initial modal
  useEffect(() => {
    if (!sessionStorage.getItem("hasSeenAuthFormModalV2")) {
      setShowInitialModal(true);
    }
  }, []);

  // Reset fields based on buyer type
  useEffect(() => {
    if (buyerType === "individual") {
      form.resetField("buyerCNPJ");
    } else {
      form.resetField("buyerCPF");
      form.resetField("buyerDocumentType");
      form.resetField("buyerDocumentNumber");
    }
  }, [buyerType, form]);

  // Handlers
  const handleContinueFromModal = () => {
    sessionStorage.setItem("hasSeenAuthFormModalV2", "true");
    setShowInitialModal(false);
  };

  const handlePickupDateSelect = (pickupDate?: Date) => {
    const purchaseDate = form.getValues("purchaseDate");
    if (purchaseDate && pickupDate) {
      const difference = differenceInDays(pickupDate, purchaseDate);
      if (difference > 15) {
        setShowDateWarningModal(true);
      }
    }
    form.trigger("pickupDate");
  };

  const handleCepBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
    const cep = e.target.value.replace(/\D/g, "");
    if (cep.length !== 8) return;

    setIsCepLoading(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await response.json();

      if (data.erro) {
        toast({
          variant: "destructive",
          title: "CEP não encontrado",
          description: "Verifique o CEP ou preencha o endereço manualmente.",
        });
        form.setValue("buyerStreet", "");
        form.setValue("buyerDistrict", "");
        form.setValue("buyerCity", "");
        form.setValue("buyerState", "");
      } else {
        form.setValue("buyerStreet", data.logradouro, { shouldValidate: true });
        form.setValue("buyerDistrict", data.bairro, { shouldValidate: true });
        form.setValue("buyerCity", data.localidade, { shouldValidate: true });
        form.setValue("buyerState", data.uf, { shouldValidate: true });
        toast({
          title: "Endereço preenchido",
          description: "Os campos foram preenchidos automaticamente.",
        });
        form.setFocus("buyerNumber");
      }
    } catch {
      toast({
        variant: "destructive",
        title: "Erro ao buscar CEP",
        description: "Preencha o endereço manualmente.",
      });
    } finally {
      setIsCepLoading(false);
    }
  };

  const getFullOrderNumber = () => {
    const orderNumber = form.getValues("orderNumber");
    return `V${orderNumber}RIHP-01`;
  };

  const getPdfTitle = () => {
    return `autorizacao_retirada_${getFullOrderNumber()}.pdf`;
  };

  const generatePdf = async () => {
    const pdfContentElement = pdfTemplateRef.current;
    if (!pdfContentElement) {
      toast({
        title: "Erro",
        description: "Template do PDF não encontrado.",
        variant: "destructive",
      });
      return;
    }

    pdfContentElement.style.display = "block";

    try {
      const canvas = await html2canvas(pdfContentElement, {
        scale: 2,
        useCORS: true,
      });

      const imgData = canvas.toDataURL("image/jpeg", 0.9);
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = pdf.internal.pageSize.getHeight();

      const props = pdf.getImageProperties(imgData);
      const ratio = props.height / props.width;

      let w = pdfW;
      let h = w * ratio;
      if (h > pdfH) {
        h = pdfH;
        w = h / ratio;
      }

      pdf.addImage(imgData, "JPEG", (pdfW - w) / 2, (pdfH - h) / 2, w, h, undefined, "FAST");

      const pdfBlob = pdf.output("blob");
      const pdfFile = new File([pdfBlob], getPdfTitle(), { type: "application/pdf" });

      if (navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
        await navigator.share({
          files: [pdfFile],
          title: `Autorização Pedido ${getFullOrderNumber()}`,
          text: `Segue o termo de autorização para o pedido ${getFullOrderNumber()}.`,
        });
      } else {
        pdf.save(getPdfTitle());
        setShowPostPdfModal(true);
      }
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      toast({
        title: "Erro ao gerar PDF",
        description: "Tente novamente em alguns instantes.",
        variant: "destructive",
      });
    } finally {
      pdfContentElement.style.display = "none";
    }
  };

  const handleGeneratePdf = async () => {
    setGenerationTimestamp(format(new Date(), "dd/MM/yyyy 'às' HH:mm:ss"));
    setIsSubmitting(true);

    const isValid = await form.trigger();
    if (!isValid) {
      setIsSubmitting(false);
      const firstError = Object.keys(form.formState.errors)[0] as keyof AuthorizationFormData;
      const element = document.querySelector(`[name="${firstError}"]`);
      element?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    try {
      await generatePdf();
    } catch (error) {
      console.error("Erro na submissão:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const onSubmit: SubmitHandler<AuthorizationFormData> = () => {
    handleGeneratePdf();
  };

  // WhatsApp and Email helpers
  const getWhatsAppMessage = () => {
    const message = `Olá, estou enviando o termo de autorização e meu documento com foto para a retirada do pedido ${getFullOrderNumber()}.`;
    return encodeURIComponent(message);
  };

  const getEmailBody = () => {
    return encodeURIComponent(
      `Olá, estou enviando o termo de autorização e meu documento com foto para a retirada do pedido ${getFullOrderNumber()}.`
    );
  };

  const getEmailSubject = () => {
    return encodeURIComponent(`Envio do Termo de Autorização - Pedido ${getFullOrderNumber()}`);
  };

  return (
    <>
      <InitialModal
        open={showInitialModal}
        onOpenChange={setShowInitialModal}
        onContinue={handleContinueFromModal}
      />

      <DateWarningModal
        open={showDateWarningModal}
        onOpenChange={setShowDateWarningModal}
      />

      <div className="max-w-4xl mx-auto px-4 py-8">
        <Card className="shadow-xl border-0">
          <CardHeader className="text-center bg-gradient-to-r from-primary/5 to-transparent pb-8">
            <div className="mb-4">
              <div className="w-20 h-20 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
                <FileCheck2 className="h-10 w-10 text-primary" />
              </div>
            </div>
            <CardTitle className="text-3xl font-bold">
              Autorização para Retirada por Terceiros
            </CardTitle>
            <CardDescription className="text-base max-w-2xl mx-auto mt-2">
              Preencha o formulário abaixo para gerar o documento de autorização.
              A pessoa autorizada deverá apresentar este termo junto com os documentos necessários.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-6 md:p-8 space-y-8">
            {/* Warning Alert */}
            <Alert variant="warning" className="bg-yellow-50 border-yellow-200">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              <AlertTitle className="text-yellow-800 font-semibold">
                Atenção aos documentos necessários
              </AlertTitle>
              <AlertDescription className="text-yellow-700">
                Você precisará enviar este PDF junto com uma foto do seu documento
                (frente e verso) para o WhatsApp ou e-mail da loja no momento da retirada.
              </AlertDescription>
            </Alert>

            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8" noValidate>
              {/* Section 1: Buyer Data */}
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <UserRound className="h-4 w-4 text-primary" />
                  </div>
                  <h2 className="text-xl font-semibold">Dados do Titular da Compra</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Buyer Type */}
                  <div className="md:col-span-2">
                    <Label>Tipo de Comprador *</Label>
                    <Controller
                      control={form.control}
                      name="buyerType"
                      render={({ field }) => (
                        <RadioGroup
                          onValueChange={field.onChange}
                          value={field.value}
                          className="flex gap-6 mt-2"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="individual" id="individual" />
                            <Label htmlFor="individual" className="cursor-pointer">
                              Pessoa Física
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="corporate" id="corporate" />
                            <Label htmlFor="corporate" className="cursor-pointer">
                              Pessoa Jurídica
                            </Label>
                          </div>
                        </RadioGroup>
                      )}
                    />
                    {form.formState.errors.buyerType && (
                      <FormErrorMessage message={form.formState.errors.buyerType.message} />
                    )}
                  </div>

                  {/* Name */}
                  <div className="md:col-span-2">
                    <FormInput
                      control={form.control}
                      name="buyerName"
                      label="Nome Completo / Razão Social *"
                      placeholder="Digite o nome completo"
                      error={form.formState.errors.buyerName}
                    />
                  </div>

                  {/* Individual Fields */}
                  {buyerType === "individual" && (
                    <>
                      <FormInput
                        control={form.control}
                        name="buyerCPF"
                        label="CPF *"
                        placeholder="000.000.000-00"
                        error={form.formState.errors.buyerCPF}
                        inputMode="numeric"
                        maxLength={14}
                        formatter={formatCPF}
                        tooltip="Digite apenas números"
                      />

                      <FormSelect
                        control={form.control}
                        name="buyerDocumentType"
                        label="Tipo de Documento com Foto *"
                        placeholder="Selecione"
                        options={documentTypeOptionsBuyer}
                        error={form.formState.errors.buyerDocumentType}
                      />

                      <FormInput
                        control={form.control}
                        name="buyerDocumentNumber"
                        label="Número do Documento *"
                        placeholder="Digite o número"
                        error={form.formState.errors.buyerDocumentNumber}
                        inputMode={repDocType === "CNH" ? "numeric" : "text"}
                        maxLength={repDocType === "CNH" ? 11 : 12}
                        disabled={!form.watch("buyerDocumentType")}
                        formatter={repDocType === "RG" ? formatRG : undefined}
                      />
                    </>
                  )}

                  {/* Corporate Fields */}
                  {buyerType === "corporate" && (
                    <div className="md:col-span-2">
                      <FormInput
                        control={form.control}
                        name="buyerCNPJ"
                        label="CNPJ *"
                        placeholder="00.000.000/0000-00"
                        error={form.formState.errors.buyerCNPJ}
                        inputMode="numeric"
                        maxLength={18}
                        formatter={formatCNPJ}
                        tooltip="Digite apenas números"
                      />
                    </div>
                  )}

                  <div className="md:col-span-2">
                    <Separator />
                  </div>

                  {/* Address Fields */}
                  <div className="relative">
                    <FormInput
                      control={form.control}
                      name="buyerCEP"
                      label="CEP *"
                      placeholder="00000-000"
                      error={form.formState.errors.buyerCEP}
                      inputMode="numeric"
                      maxLength={9}
                      formatter={formatCEP}
                      onBlur={handleCepBlur}
                    />
                    {isCepLoading && (
                      <Loader2 className="absolute right-3 top-9 h-5 w-5 animate-spin text-muted-foreground" />
                    )}
                  </div>

                  <FormInput
                    control={form.control}
                    name="buyerStreet"
                    label="Endereço *"
                    placeholder="Rua, Avenida..."
                    error={form.formState.errors.buyerStreet}
                  />

                  <FormInput
                    control={form.control}
                    name="buyerNumber"
                    label="Número *"
                    placeholder="123"
                    error={form.formState.errors.buyerNumber}
                  />

                  <FormInput
                    control={form.control}
                    name="buyerComplement"
                    label="Complemento"
                    placeholder="Apto 101"
                    error={form.formState.errors.buyerComplement}
                  />

                  <FormInput
                    control={form.control}
                    name="buyerDistrict"
                    label="Bairro *"
                    placeholder="Centro"
                    error={form.formState.errors.buyerDistrict}
                  />

                  <FormInput
                    control={form.control}
                    name="buyerCity"
                    label="Cidade *"
                    placeholder="Rio de Janeiro"
                    error={form.formState.errors.buyerCity}
                  />

                  <FormInput
                    control={form.control}
                    name="buyerState"
                    label="UF *"
                    placeholder="RJ"
                    error={form.formState.errors.buyerState}
                    maxLength={2}
                  />

                  <div className="md:col-span-2">
                    <Separator />
                  </div>

                  {/* Contact Fields */}
                  <FormInput
                    control={form.control}
                    name="buyerEmail"
                    label="E-mail *"
                    type="email"
                    placeholder="email@exemplo.com"
                    error={form.formState.errors.buyerEmail}
                  />

                  <FormInput
                    control={form.control}
                    name="buyerPhone"
                    label="Telefone *"
                    placeholder="(21) 99999-9999"
                    error={form.formState.errors.buyerPhone}
                    inputMode="tel"
                    maxLength={15}
                    formatter={formatPhone}
                    tooltip="Com DDD"
                  />
                </div>
              </div>

              {/* Section 2: Representative Data */}
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <UserCheck className="h-4 w-4 text-primary" />
                  </div>
                  <h2 className="text-xl font-semibold">Dados da Pessoa Autorizada</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <FormInput
                      control={form.control}
                      name="representativeName"
                      label="Nome Completo da Pessoa Autorizada *"
                      placeholder="Digite o nome completo"
                      error={form.formState.errors.representativeName}
                    />
                  </div>

                  <FormSelect
                    control={form.control}
                    name="representativeDocumentType"
                    label="Tipo de Documento *"
                    placeholder="Selecione RG, CNH ou CPF"
                    options={documentTypeOptionsRepresentative}
                    error={form.formState.errors.representativeDocumentType}
                  />

                  <FormInput
                    control={form.control}
                    name="representativeDocumentNumber"
                    label="Número do Documento *"
                    placeholder="Digite o número"
                    error={form.formState.errors.representativeDocumentNumber}
                    inputMode={repDocType === "CPF" || repDocType === "CNH" ? "numeric" : "text"}
                    maxLength={
                      repDocType === "RG" ? 12 : repDocType === "CNH" ? 11 : repDocType === "CPF" ? 14 : 20
                    }
                    disabled={!repDocType}
                    formatter={
                      repDocType === "CPF" ? formatCPF : repDocType === "RG" ? formatRG : undefined
                    }
                  />
                </div>
              </div>

              {/* Section 3: Order Details */}
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <ShoppingBag className="h-4 w-4 text-primary" />
                  </div>
                  <h2 className="text-xl font-semibold">Detalhes do Pedido</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormDatePicker
                    control={form.control}
                    name="purchaseDate"
                    label="Data da Compra *"
                    error={form.formState.errors.purchaseDate}
                  />

                  <FormDatePicker
                    control={form.control}
                    name="pickupDate"
                    label="Data Prevista da Retirada *"
                    error={form.formState.errors.pickupDate}
                    onDateSelect={handlePickupDateSelect}
                  />

                  <FormInput
                    control={form.control}
                    name="purchaseValue"
                    label="Valor da Compra (R$) *"
                    placeholder="0,00"
                    error={form.formState.errors.purchaseValue}
                    inputMode="decimal"
                    formatter={formatCurrency}
                  />

                  {/* Order Number with Prefix/Suffix */}
                  <FormFieldItem>
                    <Label htmlFor="orderNumber">Número do Pedido *</Label>
                    <div className="flex">
                      <span className="inline-flex items-center px-3 bg-muted border border-r-0 border-input rounded-l-md text-sm">
                        V
                      </span>
                      <Controller
                        control={form.control}
                        name="orderNumber"
                        render={({ field }) => (
                          <Input
                            {...field}
                            id="orderNumber"
                            type="text"
                            inputMode="numeric"
                            placeholder="12345678"
                            maxLength={8}
                            className={cn(
                              "rounded-none w-full",
                              form.formState.errors.orderNumber && "border-destructive"
                            )}
                            onChange={(e) => {
                              const value = e.target.value;
                              if (/^\d*$/.test(value)) {
                                field.onChange(value);
                              }
                            }}
                          />
                        )}
                      />
                      <span className="inline-flex items-center px-3 bg-muted border border-l-0 border-input rounded-r-md text-sm whitespace-nowrap">
                        RIHP-01
                      </span>
                    </div>
                    {form.formState.errors.orderNumber && (
                      <FormErrorMessage message={form.formState.errors.orderNumber.message} />
                    )}
                  </FormFieldItem>

                  <div className="md:col-span-2">
                    <FormFieldItem>
                      <Label htmlFor="pickupStore">Loja para Retirada *</Label>
                      <Controller
                        control={form.control}
                        name="pickupStore"
                        render={({ field }) => (
                          <Select onValueChange={field.onChange} value={field.value} disabled>
                            <SelectTrigger
                              id="pickupStore"
                              className={form.formState.errors.pickupStore ? "border-destructive" : ""}
                            >
                              <SelectValue placeholder="Selecione uma loja" />
                            </SelectTrigger>
                            <SelectContent>
                              {storeOptionsList.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                      {form.formState.errors.pickupStore && (
                        <FormErrorMessage message={form.formState.errors.pickupStore.message} />
                      )}
                    </FormFieldItem>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Requirements Section */}
              <div className="space-y-6">
                <div className="bg-muted/30 p-6 rounded-lg border">
                  <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                    Condições para Retirada
                  </h3>

                  <ul className="space-y-3 text-sm">
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span>O representante deve ser maior de 18 anos</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span>Documento oficial com foto do representante (original)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span>Foto do documento do comprador (frente e verso)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span>Este termo preenchido e assinado</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span>Para PJ: Contrato Social ou Estatuto</span>
                    </li>
                  </ul>
                </div>

                {/* LGPD Alert */}
                <Alert className="bg-blue-50 border-blue-200">
                  <ShieldAlert className="h-5 w-5 text-blue-600" />
                  <AlertTitle className="text-blue-800 font-semibold">
                    Proteção de Dados (LGPD)
                  </AlertTitle>
                  <AlertDescription className="text-blue-700">
                    Seus dados são processados localmente no seu dispositivo para gerar o PDF.
                    Nenhuma informação é armazenada em nossos servidores.
                  </AlertDescription>
                </Alert>

                {/* Checkboxes */}
                <div className="space-y-4">
                  <FormFieldItem>
                    <div className="flex items-start space-x-3">
                      <Controller
                        name="agreedToTerms"
                        control={form.control}
                        render={({ field }) => (
                          <Checkbox
                            id="agreedToTerms"
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        )}
                      />
                      <Label htmlFor="agreedToTerms" className="text-sm leading-tight cursor-pointer">
                        Li e concordo com o tratamento dos meus dados pessoais conforme a LGPD
                      </Label>
                    </div>
                    {form.formState.errors.agreedToTerms && (
                      <FormErrorMessage message={form.formState.errors.agreedToTerms.message} />
                    )}
                  </FormFieldItem>

                  <FormFieldItem>
                    <div className="flex items-start space-x-3">
                      <Controller
                        name="agreedToRequirements"
                        control={form.control}
                        render={({ field }) => (
                          <Checkbox
                            id="agreedToRequirements"
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        )}
                      />
                      <Label htmlFor="agreedToRequirements" className="text-sm leading-tight cursor-pointer">
                        Declaro estar ciente das exigências documentais para retirada por terceiros
                      </Label>
                    </div>
                    {form.formState.errors.agreedToRequirements && (
                      <FormErrorMessage message={form.formState.errors.agreedToRequirements.message} />
                    )}
                  </FormFieldItem>
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  size="lg"
                  className="w-full text-base font-semibold"
                  disabled={isSubmitting || !agreedToTerms || !agreedToRequirements}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="animate-spin mr-2 h-5 w-5" />
                      Gerando PDF...
                    </>
                  ) : (
                    <>
                      <Download className="mr-2 h-5 w-5" />
                      Gerar Documento PDF
                    </>
                  )}
                </Button>
              </div>
            </form>

            {/* Post-PDF Modal */}
            <AlertDialog open={showPostPdfModal} onOpenChange={setShowPostPdfModal}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-center">
                    <div className="flex justify-center mb-4">
                      <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                        <CheckCircle2 className="h-8 w-8 text-green-600" />
                      </div>
                    </div>
                    PDF Gerado com Sucesso!
                  </AlertDialogTitle>
                  <div className="space-y-4 text-center">
                    <p className="text-muted-foreground">
                      Agora envie o PDF junto com uma foto do seu documento para a loja:
                    </p>
                  </div>
                </AlertDialogHeader>

                <div className="flex flex-col gap-3">
                  <Button asChild className="w-full bg-green-600 hover:bg-green-700">
                    <a
                      href={`https://api.whatsapp.com/send/?phone=5511992011112&text=${getWhatsAppMessage()}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        className="h-5 w-5 mr-2"
                      >
                        <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.3-1.38c1.45.79 3.08 1.21 4.7 1.21 5.46 0 9.91-4.45 9.91-9.91S17.5 2 12.04 2zM12.05 20.2c-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.81.83-3.04-.2-.31c-.82-1.31-1.26-2.83-1.26-4.41 0-4.54 3.7-8.23 8.24-8.23 2.22 0 4.28.86 5.82 2.41 1.55 1.54 2.41 3.6 2.41 5.82-.01 4.54-3.7 8.24-8.23 8.24zm4.52-6.13c-.25-.12-1.47-.72-1.7-.81-.23-.08-.39-.12-.56.12-.17.25-.64.81-.79.97-.15.17-.29.19-.54.06-.25-.12-1.06-.39-2.02-1.24-.75-.66-1.25-1.48-1.4-1.73-.14-.25-.02-.38.11-.51.11-.11.25-.29.37-.43.13-.14.17-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.41-.42-.56-.42-.14 0-.3 0-.46 0-.16 0-.41.06-.62.31-.22.25-.83.81-.83 1.98 0 1.16.85 2.3 1.05 2.5.14.17 1.67 2.56 4.05 3.55.57.23 1.02.37 1.37.47.59.17 1.13.15 1.56.09.48-.06 1.47-.6 1.67-1.18.21-.58.21-1.07.15-1.18-.06-.12-.22-.19-.47-.31z" />
                      </svg>
                      Enviar por WhatsApp
                    </a>
                  </Button>

                  <Button asChild variant="outline" className="w-full">
                    <a
                      href={`mailto:loja187@rihappy.com.br?subject=${getEmailSubject()}&body=${getEmailBody()}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Mail className="h-5 w-5 mr-2" />
                      Enviar por E-mail
                    </a>
                  </Button>

                  <AlertDialogCancel className="w-full mt-2">Fechar</AlertDialogCancel>
                </div>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>

          <footer className="text-center p-6 border-t text-sm text-muted-foreground">
            <p>Ri Happy é uma empresa do Grupo Ri Happy S/A | CNPJ 58.731.662/0001-11</p>
            <p>Av. Eng. Luís Carlos Berrini, 105 – São Paulo/SP</p>
          </footer>
        </Card>
      </div>

      <AuthorizationPdfTemplate
        pdfTemplateRef={pdfTemplateRef}
        generationTimestamp={generationTimestamp}
        form={form}
        signatureDataUrl={null}
      />
    </>
  );
};

// Helper Components (FormFieldItem, FormErrorMessage, etc.)

interface FormFieldItemProps {
  children: React.ReactNode;
  className?: string;
}

const FormFieldItem: React.FC<FormFieldItemProps> = ({ children, className }) => (
  <div className={cn("space-y-2", className)}>{children}</div>
);

interface FormErrorMessageProps {
  message?: string;
}

const FormErrorMessage: React.FC<FormErrorMessageProps> = ({ message }) =>
  message ? <p className="text-sm text-destructive">{message}</p> : null;

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  control: any;
  name: keyof AuthorizationFormData;
  label: string;
  placeholder?: string;
  type?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  error?: any;
  tooltip?: string;
  formatter?: (value: string) => string;
}

const FormInput: React.FC<FormInputProps> = ({
  control,
  name,
  label,
  placeholder,
  type = "text",
  inputMode,
  error,
  tooltip,
  formatter,
  className,
  ...props
}) => (
  <FormFieldItem className={className}>
    <div className="flex items-center gap-2">
      <Label htmlFor={String(name)}>{label}</Label>
      {tooltip && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <HelpCircle className="h-4 w-4 text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent>
              <p>{tooltip}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <Input
          id={String(name)}
          type={type}
          inputMode={inputMode}
          placeholder={placeholder}
          {...field}
          {...props}
          onChange={(e) => {
            const value = e.target.value;
            field.onChange(formatter ? formatter(value) : value);
          }}
          value={String(field.value || "")}
          className={error ? "border-destructive" : ""}
        />
      )}
    />
    {error && <FormErrorMessage message={error.message} />}
  </FormFieldItem>
);

interface FormSelectProps {
  control: any;
  name: keyof AuthorizationFormData;
  label: string;
  placeholder: string;
  options: { value: string; label: string }[];
  error?: any;
  className?: string;
  onValueChange?: (value: string) => void;
}

const FormSelect: React.FC<FormSelectProps> = ({
  control,
  name,
  label,
  placeholder,
  options,
  error,
  className,
  onValueChange,
}) => (
  <FormFieldItem className={className}>
    <Label htmlFor={String(name)}>{label}</Label>
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <Select
          onValueChange={(value) => {
            field.onChange(value);
            onValueChange?.(value);
          }}
          value={field.value || undefined}
        >
          <SelectTrigger id={String(name)} className={error ? "border-destructive" : ""}>
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    />
    {error && <FormErrorMessage message={error.message} />}
  </FormFieldItem>
);

interface FormDatePickerProps {
  control: any;
  name: "purchaseDate" | "pickupDate";
  label: string;
  error?: any;
  onDateSelect?: (date?: Date) => void;
}

const FormDatePicker: React.FC<FormDatePickerProps> = ({
  control,
  name,
  label,
  error,
  onDateSelect,
}) => (
  <FormFieldItem>
    <Label htmlFor={name}>{label}</Label>
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <Popover>
          <PopoverTrigger asChild>
            <Button
              id={name}
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal",
                !field.value && "text-muted-foreground",
                error && "border-destructive"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {field.value ? (
                format(field.value, "PPP", { locale: ptBR })
              ) : (
                <span>Selecione uma data</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={field.value}
              onSelect={(date) => {
                field.onChange(date);
                onDateSelect?.(date);
              }}
              initialFocus
              locale={ptBR}
              disabled={(date) => date < new Date("1900-01-01") || date > new Date("2100-01-01")}
            />
          </PopoverContent>
        </Popover>
      )}
    />
    {error && <FormErrorMessage message={error.message} />}
  </FormFieldItem>
);

export default AuthorizationForm;

    