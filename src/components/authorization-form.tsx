
"use client";

import React, { useState, useRef, useEffect } from 'react';
import { useForm, Controller, SubmitHandler, useWatch, type Control, type FieldError, type UseFormSetValue, type UseFormTrigger } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { authorizationSchema, AuthorizationFormData, storeOptionsList, documentTypeOptionsBuyer, documentTypeOptionsRepresentative } from '@/lib/schemas';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from '@/lib/utils';
import { format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon, HelpCircle, Mail, Download, Loader2, Link as LinkIcon, ExternalLink, ShieldAlert, FileText, FileCheck2, UserCheck, ShoppingBag, AlertTriangle, UserRound, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Checkbox } from '@/components/ui/checkbox';
import Image from 'next/image';
import { Alert, AlertTitle, AlertDescription } from './ui/alert';
import { Separator } from './ui/separator';

const PICKUP_ADDRESS = "Avenida Vicente de Carvalho, 909 - Vicente de Carvalho - Rio de Janeiro - RJ - 21211-007 - pickup";

// --- Formatting Utilities ---
const formatPhone = (value: string) => {
  if (!value) return "";
  const cleaned = value.replace(/\D/g, '');
  if (cleaned.length <= 2) return `(${cleaned}`;
  if (cleaned.length <= 6) return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2)}`;
  if (cleaned.length <= 10) return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
  return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7, 11)}`;
};

const formatCPF = (value: string) => {
  if (!value) return "";
  const cleaned = value.replace(/\D/g, '');
  if (cleaned.length <= 3) return cleaned;
  if (cleaned.length <= 6) return `${cleaned.slice(0, 3)}.${cleaned.slice(3)}`;
  if (cleaned.length <= 9) return `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6)}`;
  return `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6, 9)}-${cleaned.slice(9, 11)}`;
};

const formatCNPJ = (value: string) => {
    if (!value) return "";
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length <= 2) return cleaned;
    if (cleaned.length <= 5) return `${cleaned.slice(0, 2)}.${cleaned.slice(2)}`;
    if (cleaned.length <= 8) return `${cleaned.slice(0, 2)}.${cleaned.slice(2, 5)}.${cleaned.slice(5)}`;
    if (cleaned.length <= 12) return `${cleaned.slice(0, 2)}.${cleaned.slice(2, 5)}.${cleaned.slice(5, 8)}/${cleaned.slice(8)}`;
    return `${cleaned.slice(0, 2)}.${cleaned.slice(2, 5)}.${cleaned.slice(5, 8)}/${cleaned.slice(8, 12)}-${cleaned.slice(12, 14)}`;
};

const formatCurrency = (value: string) => {
    if (!value) return "";
    let cleaned = value.replace(/\D/g, '');
    if (!cleaned) return "";
    cleaned = (parseInt(cleaned, 10) / 100).toFixed(2);
    return cleaned.replace('.', ',');
};

const formatRG = (value: string) => {
    if (!value) return "";
    return value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
}

const formatCEP = (value: string) => {
  if (!value) return "";
  return value.replace(/\D/g, '').replace(/^(\d{5})(\d)/, '$1-$2').slice(0, 9);
};


const InitialModal = ({ open, onOpenChange, onContinue }: { open: boolean, onOpenChange: (open: boolean) => void, onContinue: () => void }) => {
  const [agreed, setAgreed] = useState(false);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-xl font-semibold">Autorização para Retirada por Terceiros – Formato Auxiliar</AlertDialogTitle>
          <div className="text-sm text-foreground/80 text-left pt-2 space-y-3">
            <p>Este formulário digital é um recurso auxiliar criado para facilitar o preenchimento da autorização de retirada por terceiros.</p>
            <p>As regras oficiais da modalidade “Retira em Loja” permanecem válidas e devem ser observadas conforme o regulamento disponível no site oficial da empresa.</p>
            <p>Caso prefira, você pode utilizar o modelo oficial de autorização disponibilizado pela empresa para impressão manual.</p>
            <p>O uso deste formulário não substitui as exigências previstas no regulamento oficial.</p>
            <p className="pt-2">Para que a retirada seja autorizada, o representante deverá ser maior de 18 anos e apresentar documento oficial com foto, este termo assinado e cópia do documento do comprador. Para pessoa jurídica, será exigido Contrato Social ou Estatuto.</p>
          </div>
        </AlertDialogHeader>
        
        <div className="bg-muted/50 p-4 rounded-md mt-2 space-y-3 text-sm">
          <a href="https://www.rihappy.com.br/retira-em-loja" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-primary hover:underline">
            <ExternalLink className="h-4 w-4" />
            Regulamento oficial “Retira em Loja”
          </a>
          <a href="https://files.directtalk.com.br/1.0/api/file/public/4c70e9a0-3b7c-4097-8b2f-082157e66860/content-inline" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-primary hover:underline">
            <ExternalLink className="h-4 w-4" />
            Modelo oficial de autorização para impressão
          </a>
        </div>

        <div className="mt-4 space-y-3">
          <p className="text-sm font-medium">Ao continuar, você declara estar ciente de que este é um formato auxiliar e que o regulamento oficial permanece válido.</p>
          <div className="flex items-center space-x-2">
            <Checkbox id="modal-agree" checked={agreed} onCheckedChange={(checked) => setAgreed(checked as boolean)} />
            <Label htmlFor="modal-agree" className="text-sm font-normal">Li e compreendi as informações acima.</Label>
          </div>
        </div>

        <AlertDialogFooter className="mt-4 gap-2 sm:gap-0">
          <Button variant="outline" asChild>
            <a href="https://files.directtalk.com.br/1.0/api/file/public/4c70e9a0-3b7c-4097-8b2f-082157e66860/content-inline" target="_blank" rel="noopener noreferrer">Acessar modelo oficial</a>
          </Button>
          <Button onClick={onContinue} disabled={!agreed}>
            Continuar para o formulário
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

const DateWarningModal = ({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) => (
  <AlertDialog open={open} onOpenChange={onOpenChange}>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle className="flex items-center gap-2">
          <AlertTriangle className="h-6 w-6 text-yellow-600" />
          Atenção sobre a Data de Retirada
        </AlertDialogTitle>
        <div className="pt-4 text-sm text-foreground/90">
          <p>A data de retirada selecionada é superior a 15 dias da data da compra.</p>
          <p className="mt-2">Conforme nossa política, pedidos não retirados em até 15 dias corridos podem ser cancelados automaticamente e o valor estornado.</p>
          <p className="mt-2 font-medium">Por favor, verifique o status do seu pedido antes de prosseguir.</p>
        </div>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogAction onClick={() => onOpenChange(false)}>Entendi</AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);


type PdfTemplateProps = {
  pdfTemplateRef: React.RefObject<HTMLDivElement>;
  generationTimestamp: string | null;
  getFullOrderNumber: () => string;
  form: any; // useForm<AuthorizationFormData>
  signatureDataUrl?: string | null; // ex: "data:image/png;base64,...."
};

export function AuthorizationPdfTemplate({
  pdfTemplateRef,
  generationTimestamp,
  getFullOrderNumber,
  form,
  signatureDataUrl = null,
}: PdfTemplateProps) {
  const buildSignerIdLine = () => {
    const buyerType = form.getValues("buyerType");
    if (buyerType === "individual") {
      const dt = String(form.getValues("buyerDocumentType") || "").toUpperCase();
      const dn = String(form.getValues("buyerDocumentNumber") || "");
      if (dt && dn) return `${dt} nº ${dn}`;
      // fallback: CPF se doc não estiver presente
      const cpf = String(form.getValues("buyerCPF") || "");
      return cpf ? `CPF nº ${cpf}` : "";
    }
    const cnpj = String(form.getValues("buyerCNPJ") || "");
    return cnpj ? `CNPJ nº ${cnpj}` : "";
  };

  return (
    <div
      ref={pdfTemplateRef}
      className="hidden"
      style={{
        position: "fixed",
        left: "-400mm",
        top: 0,
        width: "210mm",
        height: "297mm",
        backgroundColor: "#fff",
        overflow: "hidden",
      }}
    >
      <style>
        {`
      .a4 {
        width: 210mm;
        height: 297mm;
        padding: 20mm;
        box-sizing: border-box;
        font-family: Arial, Helvetica, sans-serif;
        color: #000;
        font-size: 10.5pt;
        line-height: 1.15;
        position: relative;
      }

      .a4 .logo-wrap { text-align: center; margin: 0 0 3mm 0; }
      .a4 .logo { width: 52px; height: auto; display: inline-block; }

      .a4 .title {
        text-align: center;
        font-weight: 700;
        text-transform: uppercase;
        font-size: 12pt;
        margin: 0 0 5mm 0;
        letter-spacing: 0.2px;
      }

      .a4 table {
        width: 100%;
        border-collapse: collapse;
        table-layout: fixed;
        margin-bottom: 5mm;
      }

      .a4 th, .a4 td {
        border: 1px solid #000;
        padding: 2.1mm 2.4mm;
        vertical-align: middle;
        word-wrap: break-word;
      }

      .a4 th.section {
        font-weight: 700;
        text-align: center;
        background: #fff;
      }

      .a4 td.lbl {
        width: 26%;
        font-size: 9.5pt;
        text-align: left;
      }

      .a4 td.val {
        width: 74%;
        text-align: left;
      }

      .a4 td.half { width: 50%; }

      .a4 tr.row { height: 10mm; }

      .a4 .para {
        margin: 0 0 3.5mm 0;
        text-align: justify;
        font-size: 9.7pt;
        line-height: 1.2;
      }

      .a4 .order-head th{
        font-size: 9.5pt;
        text-align: center;
        vertical-align: middle;
      }
      .a4 .order-body td{
        text-align: center;
        vertical-align: middle;
      }

      .a4 .pickup-date {
        font-size: 9.7pt;
        margin-top: 2mm;
      }

      .a4 .sign-block {
        position: absolute;
        left: 20mm;
        right: 20mm;
        bottom: 26mm;
      }

      .a4 .sign-label {
        font-size: 9.7pt;
        margin-bottom: 1.6mm;
      }

      .a4 .signature-box {
        width: 100%;
        height: 20mm;
        border: 1px solid #000;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
        background: #fff;
        padding: 2mm;
        box-sizing: border-box;
        text-align: center;
      }

      .a4 .signature-img {
        max-width: 100%;
        max-height: 100%;
        object-fit: contain;
      }

      .a4 .sign-caption {
        font-size: 9pt;
        margin-top: 1.6mm;
      }

      .a4 .gen-info {
        font-size: 8.5pt;
        margin-top: 1.8mm;
        text-align: center;
      }

      .a4 .small-note {
        position: absolute;
        left: 20mm;
        right: 20mm;
        bottom: 12mm;
        font-size: 8.5pt;
        line-height: 1.15;
      }
    `}
      </style>

      <div className="a4">
        <div className="logo-wrap">
          <img
            src="https://rihappynovo.vtexassets.com/arquivos/solzinhoFooterNew.png"
            alt="Logo Ri Happy"
            className="logo"
            crossOrigin="anonymous"
          />
        </div>

        <div className="title">TERMO DE AUTORIZAÇÃO PARA RETIRADA POR TERCEIRO</div>

        <table>
          <thead>
            <tr>
              <th className="section" colSpan={4}>COMPRADOR</th>
            </tr>
          </thead>
          <tbody>
            <tr className="row">
              <td className="lbl">Nome/Razão Social:</td>
              <td className="val" colSpan={3}>{form.getValues("buyerName") || ""}</td>
            </tr>

            {form.getValues("buyerType") === "individual" ? (
              <tr className="row">
                <td className="lbl">RG</td>
                <td className="half">
                  {String(form.getValues("buyerDocumentType") || "").toUpperCase() === "RG"
                    ? (form.getValues("buyerDocumentNumber") || "")
                    : ""}
                </td>
                <td className="lbl">CPF</td>
                <td className="half">{form.getValues("buyerCPF") || ""}</td>
              </tr>
            ) : (
              <tr className="row">
                <td className="lbl">CNPJ</td>
                <td className="val" colSpan={3}>{form.getValues("buyerCNPJ") || ""}</td>
              </tr>
            )}

            <tr className="row">
              <td className="lbl">Endereço</td>
              <td className="val" colSpan={3}>
                {`${form.getValues("buyerStreet") || ""}, ${form.getValues("buyerNumber") || ""}${form.getValues("buyerComplement") ? ` - ${form.getValues("buyerComplement")}` : ''}`}
              </td>
            </tr>
            <tr className="row">
              <td className="lbl">Município</td>
              <td className="half">{form.getValues("buyerCity") || ""}</td>
              <td className="lbl">UF</td>
              <td className="half">{form.getValues("buyerState") || ""}</td>
            </tr>
          </tbody>
        </table>

        <table>
          <thead>
            <tr>
              <th className="section" colSpan={4}>REPRESENTANTE</th>
            </tr>
          </thead>
          <tbody>
            <tr className="row">
              <td className="lbl">Nome/Razão Social:</td>
              <td className="val" colSpan={3}>{form.getValues("representativeName") || ""}</td>
            </tr>

            <tr className="row">
              <td className="lbl">RG</td>
              <td className="half">
                {String(form.getValues("representativeDocumentType") || "").toUpperCase() === "RG"
                  ? (form.getValues("representativeDocumentNumber") || "")
                  : ""}
              </td>
              <td className="lbl">CPF</td>
              <td className="half">
                {String(form.getValues("representativeDocumentType") || "").toUpperCase() === "CPF"
                  ? (form.getValues("representativeDocumentNumber") || "")
                  : ""}
              </td>
            </tr>

            <tr className="row">
              <td className="lbl">Endereço</td>
              <td className="val" colSpan={3}></td>
            </tr>
            <tr className="row">
              <td className="lbl">Município</td>
              <td className="half"></td>
              <td className="lbl">UF</td>
              <td className="half"></td>
            </tr>
          </tbody>
        </table>

        <p className="para">
          O COMPRADOR autoriza seu REPRESENTANTE, acima identificado, a retirar os produtos listados no Pedido, cujas informações estão
          detalhadas no quadro abaixo, na loja física escolhida pelo COMPRADOR no momento da realização de sua compra no site.
        </p>
        <p className="para">
          Para retirada dos produtos, o REPRESENTANTE deverá ser maior de 18 anos, estar munido de documento oficial com foto e deste termo
          devidamente assinado eletronicamente pelo COMPRADOR e uma cópia (foto/imagem) do documento de identidade oficial do COMPRADOR.
          Sendo o COMPRADOR pessoa jurídica, uma foto ou cópia (imagem legível) do Contrato Social / Estatuto Social da empresa do COMPRADOR
          deverá ser apresentada. (*)
        </p>
        <p className="para">
          O horário de funcionamento da loja física escolhida para retirada do pedido, deverá ser respeitado.
        </p>

        <table>
          <thead className="order-head">
            <tr>
              <th>Data da Compra</th>
              <th>Valor da Compra</th>
              <th>Nº do Pedido</th>
              <th>Loja para Retirada</th>
            </tr>
          </thead>
          <tbody className="order-body">
            <tr className="row">
              <td>
                {form.getValues("purchaseDate") ? format(form.getValues("purchaseDate")!, "dd/MM/yyyy") : ""}
              </td>
              <td>R$ {String(form.getValues("purchaseValue") || "").replace(".", ",")}</td>
              <td>{getFullOrderNumber()}</td>
              <td>
                {PICKUP_ADDRESS}
              </td>
            </tr>
          </tbody>
        </table>

        <div className="pickup-date">
          Data da retirada:{" "}
          {form.getValues("pickupDate")
            ? format(form.getValues("pickupDate")!, "dd/MM/yyyy")
            : "A definir no ato da retirada"}
        </div>

        <div className="sign-block">
          <div className="sign-label">Assinatura do comprador:</div>

          <div className="signature-box">
            {signatureDataUrl ? (
              <img src={signatureDataUrl} alt="Assinatura" className="signature-img" crossOrigin="anonymous" />
            ) : (
              <div style={{ fontSize: "9pt", lineHeight: 1.2 }}>
                <strong>Assinatura eletrônica registrada em:</strong>{" "}
                {generationTimestamp || ""}{" "}
                {buildSignerIdLine() ? `| ${buildSignerIdLine()}` : ""}
              </div>
            )}
          </div>

          <div className="sign-caption">Assinatura do comprador</div>
        </div>

        <div className="small-note">
          (*) Os documentos mencionados e obrigatórios para entrega do(s) produto(s), não serão retidos em loja, após a conferência, serão
          devolvidos ao terceiro autorizado.
        </div>
      </div>
    </div>
  );
}


export function AuthorizationForm() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showGlobalError, setShowGlobalError] = useState(false);
  const [showPostPdfModal, setShowPostPdfModal] = useState(false);
  const pdfTemplateRef = useRef<HTMLDivElement>(null);
  const [isInitialModalOpen, setIsInitialModalOpen] = useState(false);
  const [generationTimestamp, setGenerationTimestamp] = useState<string | null>(null);
  const [showDateWarningModal, setShowDateWarningModal] = useState(false);
  const [isCepLoading, setIsCepLoading] = useState(false);


  useEffect(() => {
    // Only show the modal once per session
    if (!sessionStorage.getItem('hasSeenAuthFormModalV2')) {
        setIsInitialModalOpen(true);
    }
  }, []);

  const handleContinueFromModal = () => {
      sessionStorage.setItem('hasSeenAuthFormModalV2', 'true');
      setIsInitialModalOpen(false);
  };


  const form = useForm<AuthorizationFormData>({
    resolver: zodResolver(authorizationSchema),
    defaultValues: {
      buyerType: 'individual',
      buyerName: '',
      buyerEmail: '',
      buyerPhone: '',
      buyerCPF: '',
      buyerDocumentType: undefined,
      buyerDocumentNumber: '',
      buyerCNPJ: '',
      buyerCEP: '',
      buyerStreet: '',
      buyerNumber: '',
      buyerComplement: '',
      buyerDistrict: '',
      buyerCity: '',
      buyerState: '',
      representativeName: '',
      representativeDocumentType: undefined,
      representativeDocumentNumber: '',
      purchaseValue: '',
      orderNumber: '',
      pickupStore: '1187 - CARIOCA SHOPPING',
      agreedToTerms: false,
      agreedToRequirements: false,
    },
     mode: "onBlur",
  });

  const buyerType = form.watch('buyerType');
  const agreedToTerms = form.watch('agreedToTerms');
  const agreedToRequirements = form.watch('agreedToRequirements');
  const buyerDocType = useWatch({ control: form.control, name: 'buyerDocumentType' });
  const repDocType = useWatch({ control: form.control, name: 'representativeDocumentType' });

  useEffect(() => {
    if (buyerType === 'individual') {
        form.resetField('buyerCNPJ');
    } else {
        form.resetField('buyerCPF');
        form.resetField('buyerDocumentType');
        form.resetField('buyerDocumentNumber');
    }
  }, [buyerType, form]);

  const handlePickupDateSelect = (pickupDate?: Date) => {
    const purchaseDate = form.getValues('purchaseDate');
    if (purchaseDate && pickupDate) {
      const difference = differenceInDays(pickupDate, purchaseDate);
      if (difference > 15) {
        setShowDateWarningModal(true);
      }
    }
    form.trigger("pickupDate");
  };

  const getFullOrderNumber = () => {
    const orderNumberValue = form.getValues('orderNumber');
    return `V${orderNumberValue}RIHP-01`;
  };

  const getPdfTitle = () => {
    const orderNumber = getFullOrderNumber();
    return `autorizacao_retirada_${orderNumber}.pdf`;
  };
  
  const getWhatsAppMessage = () => {
    const orderNumber = getFullOrderNumber();
    const message = `Olá, estou enviando o termo de autorização e meu documento com foto para a retirada do pedido ${orderNumber}.`;
    return encodeURIComponent(message);
  };

  const getEmailBody = () => {
     const orderNumber = getFullOrderNumber();
     const message = `Olá, estou enviando o termo de autorização e meu documento com foto para a retirada do pedido ${orderNumber}.`;
     return encodeURIComponent(message);
  };
  
  const getEmailSubject = () => {
    const orderId = getFullOrderNumber();
    return encodeURIComponent(`Envio do Termo de Autorização de Retirada - Pedido ${orderId}`);
  };

  const handleCepBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
    const cep = e.target.value.replace(/\D/g, '');
    form.trigger('buyerCEP'); // Trigger validation on blur
    if (cep.length !== 8) {
      return;
    }

    setIsCepLoading(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      if (!response.ok) throw new Error('Falha na busca do CEP');
      const data = await response.json();

      if (data.erro) {
        toast({
          variant: "destructive",
          title: "CEP não encontrado",
          description: "Por favor, verifique o CEP e tente novamente. Você pode preencher o endereço manualmente.",
        });
        form.setValue('buyerStreet', '');
        form.setValue('buyerDistrict', '');
        form.setValue('buyerCity', '');
        form.setValue('buyerState', '');
      } else {
        form.setValue('buyerStreet', data.logradouro, { shouldValidate: true });
        form.setValue('buyerDistrict', data.bairro, { shouldValidate: true });
        form.setValue('buyerCity', data.localidade, { shouldValidate: true });
        form.setValue('buyerState', data.uf, { shouldValidate: true });
        toast({
          title: "Endereço preenchido",
          description: "Os campos de endereço foram preenchidos automaticamente.",
        });
        form.setFocus('buyerNumber');
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro ao buscar CEP",
        description: "Não foi possível conectar ao serviço de CEP. Preencha o endereço manualmente.",
      });
    } finally {
      setIsCepLoading(false);
    }
  };

  const generatePdf = async () => {
    const pdfContentElement = pdfTemplateRef.current;
    if (!pdfContentElement) {
      toast({ title: "Erro", description: "Template do PDF não encontrado.", variant: "destructive" });
      return;
    }

    pdfContentElement.style.display = 'block';
    
    try {
      const canvas = await html2canvas(pdfContentElement, {
        scale: 1.5,
        useCORS: true,
        backgroundColor: "#fff",
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.9);
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = pdf.internal.pageSize.getHeight();

      const props = pdf.getImageProperties(imgData);
      const ratio = props.height / props.width;

      let w = pdfW;
      let h = w * ratio;
      if (h > pdfH) { h = pdfH; w = h / ratio; }
      
      pdf.addImage(imgData, "JPEG", (pdfW - w) / 2, (pdfH - h) / 2, w, h, undefined, "FAST");
      
      const pdfBlob = pdf.output('blob');
      const pdfFile = new File([pdfBlob], getPdfTitle(), { type: 'application/pdf' });
      
      if (navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
        await navigator.share({
          files: [pdfFile],
          title: `Autorização Pedido ${getFullOrderNumber()}`,
          text: `Segue o termo de autorização para o pedido ${getFullOrderNumber()}.`,
        });
        toast({ variant: "default", title: "Pronto para Enviar!", description: "Selecione o WhatsApp ou E-mail para compartilhar o PDF." });
      } else {
        pdf.save(getPdfTitle());
        setShowPostPdfModal(true);
      }

    } catch (error) {
      console.error("Erro ao gerar ou compartilhar PDF:", error);
      toast({ title: "Erro ao gerar PDF", description: "Não foi possível gerar o PDF. Tente novamente.", variant: "destructive" });
    } finally {
       if (pdfContentElement) {
        pdfContentElement.style.display = 'none';
       }
    }
  };

  const handleGeneratePdf = async () => {
    setIsSubmitting(true);
    setShowGlobalError(false);
    
    setGenerationTimestamp(format(new Date(), "dd/MM/yyyy 'às' HH:mm:ss"));

    const isValid = await form.trigger();
    if (!isValid) {
        setShowGlobalError(true);
        setIsSubmitting(false);
        const firstErrorField = Object.keys(form.formState.errors)[0] as keyof AuthorizationFormData;
        const element = document.querySelector(`[name="${firstErrorField}"]`);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        return;
    }
    
    try {
      await generatePdf();
    } catch (error) {
      console.error("Erro no processo de submissão:", error);
      toast({ title: "Erro na submissão", description: "Falha ao processar os dados para PDF.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const onSubmit: SubmitHandler<AuthorizationFormData> = (_data) => {
    handleGeneratePdf();
  };

  return (
    <>
    <InitialModal open={isInitialModalOpen} onOpenChange={setIsInitialModalOpen} onContinue={handleContinueFromModal} />
    <DateWarningModal open={showDateWarningModal} onOpenChange={setShowDateWarningModal} />
    
    <Card className="w-full shadow-lg p-6 sm:p-8 md:p-10">
      <CardHeader className='p-0 text-center mb-8'>
        <h1 className="text-2xl font-bold text-foreground">
          Autorização para Retirada por Terceiros
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          A DIVERSÃO CONTINUA COM VOCÊ! Preencha o Termo de Autorização se outra pessoa for retirar seu pedido.
        </p>
      </CardHeader>

      <CardContent className="p-0 space-y-8">
        <Alert variant="warning" className='bg-yellow-100/60 border-yellow-300'>
          <AlertTriangle className="h-5 w-5 text-yellow-600" />
          <AlertTitle className='font-semibold text-yellow-800'>Atenção aos documentos</AlertTitle>
          <div className='text-yellow-700/90'>
             Não solicitamos anexos de documentos neste formulário. A cópia digital (foto ou PDF) do documento do comprador deverá ser enviada junto com o PDF do termo, para o WhatsApp ou e-mail da loja no momento da retirada. As cópias devem estar legíveis.
          </div>
        </Alert>

          <form 
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-10"
            noValidate
          >
            <Card className="border-border/60 p-6">
              <CardHeader className='p-0 mb-4'>
                <CardTitle className='flex items-center gap-2'><UserRound className="h-5 w-5 text-primary" />1. Dados do Titular da Compra</CardTitle>
                <CardDescription>Preencha exatamente como no e-mail de confirmação do pedido.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                  <FormFieldItem className="md:col-span-2">
                    <Label>Tipo de Comprador *</Label>
                    <Controller
                      control={form.control}
                      name="buyerType"
                      render={({ field }) => (
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex space-x-4 pt-2"
                        >
                          <FormItemRadio value="individual" label="Pessoa Física" field={field} />
                          <FormItemRadio value="corporate" label="Pessoa Jurídica" field={field} />
                        </RadioGroup>
                      )}
                    />
                    {form.formState.errors.buyerType && <FormErrorMessage message={form.formState.errors.buyerType.message} />}
                  </FormFieldItem>

                  <div className="md:col-span-2">
                    <FormInput control={form.control} name="buyerName" label="Nome Completo / Razão Social *" placeholder="João Silva / Empresa XYZ LTDA" error={form.formState.errors.buyerName} />
                  </div>

                  {buyerType === 'individual' && (
                    <>
                      <FormInput control={form.control} name="buyerCPF" label="CPF do Comprador *" placeholder="000.000.000-00" error={form.formState.errors.buyerCPF} inputMode="numeric" maxLength={14} formatter={formatCPF} tooltip="Digite apenas os números."/>
                      <FormSelect
                          control={form.control}
                          trigger={form.trigger}
                          setValue={form.setValue}
                          name="buyerDocumentType"
                          label="Tipo de Documento com Foto *"
                          placeholder="Selecione RG ou CNH"
                          options={documentTypeOptionsBuyer}
                          error={form.formState.errors.buyerDocumentType}
                      />
                      <FormInput
                          control={form.control}
                          name="buyerDocumentNumber"
                          label={`Número do ${buyerDocType || 'Documento'} *`}
                          placeholder={!buyerDocType ? "Selecione o tipo" : (buyerDocType === 'CNH' ? '00000000000' : '00.000.000-0')}
                          error={form.formState.errors.buyerDocumentNumber}
                          inputMode={buyerDocType === 'CNH' ? 'numeric' : 'text'}
                          maxLength={buyerDocType === 'CNH' ? 11 : 12}
                          disabled={!buyerDocType}
                          formatter={buyerDocType === 'RG' ? formatRG : undefined}
                      />
                    </>
                  )}
                  {buyerType === 'corporate' && (
                    <>
                      <FormInput control={form.control} name="buyerCNPJ" label="CNPJ *" placeholder="00.000.000/0000-00" error={form.formState.errors.buyerCNPJ} inputMode="numeric" className="md:col-span-2" maxLength={18} formatter={formatCNPJ} tooltip="Digite apenas os números." />
                    </>
                  )}
                  <div className="md:col-span-2"><Separator /></div>

                  <FormFieldItem className='relative'>
                    <FormInput control={form.control} name="buyerCEP" label="CEP *" placeholder="00000-000" error={form.formState.errors.buyerCEP} inputMode="numeric" maxLength={9} formatter={formatCEP} onBlur={handleCepBlur} />
                    {isCepLoading && <Loader2 className="absolute right-3 top-9 h-5 w-5 animate-spin text-muted-foreground" />}
                  </FormFieldItem>

                  <FormInput control={form.control} name="buyerStreet" label="Endereço *" placeholder="Av. Brasil" error={form.formState.errors.buyerStreet} disabled={isCepLoading} />
                  
                  <FormInput control={form.control} name="buyerNumber" label="Número *" placeholder="123" error={form.formState.errors.buyerNumber} disabled={isCepLoading} />
                  
                  <FormInput control={form.control} name="buyerComplement" label="Complemento" placeholder="Apto 101" error={form.formState.errors.buyerComplement} disabled={isCepLoading} />

                  <FormInput control={form.control} name="buyerDistrict" label="Bairro *" placeholder="Centro" error={form.formState.errors.buyerDistrict} disabled={isCepLoading} />

                  <FormInput control={form.control} name="buyerCity" label="Cidade *" placeholder="Rio de Janeiro" error={form.formState.errors.buyerCity} disabled={isCepLoading} />

                  <FormInput control={form.control} name="buyerState" label="UF *" placeholder="RJ" error={form.formState.errors.buyerState} maxLength={2} disabled={isCepLoading} />

                  <div className="md:col-span-2"><Separator /></div>


                  <FormInput control={form.control} name="buyerEmail" label="E-mail do Comprador *" placeholder="comprador@exemplo.com" type="email" error={form.formState.errors.buyerEmail} />
                  <FormInput control={form.control} name="buyerPhone" label="Telefone do Comprador *" placeholder="(XX) XXXXX-XXXX" type="tel" error={form.formState.errors.buyerPhone} inputMode="tel" maxLength={15} formatter={formatPhone} tooltip="Com DDD." />
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-border/60 p-6">
              <CardHeader className='p-0 mb-4'>
                <CardTitle className='flex items-center gap-2'><UserCheck className="h-5 w-5 text-primary" />2. Dados da Pessoa Autorizada a Retirar</CardTitle>
                <CardDescription>Essa pessoa precisa ser maior de idade e apresentar um documento original com foto na loja.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                  <div className="md:col-span-2">
                  <FormInput control={form.control} name="representativeName" label="Nome Completo da Pessoa Autorizada *" placeholder="Maria Oliveira" error={form.formState.errors.representativeName} />
                  </div>
                  <FormSelect
                      control={form.control}
                      trigger={form.trigger}
                      setValue={form.setValue}
                      name="representativeDocumentType"
                      label="Tipo de Documento da Pessoa Autorizada *"
                      placeholder="Selecione RG, CNH ou CPF"
                      options={documentTypeOptionsRepresentative}
                      error={form.formState.errors.representativeDocumentType}
                  />
                  <FormInput
                      control={form.control}
                      name="representativeDocumentNumber"
                      label={`Número do ${repDocType || 'Documento'} *`}
                      placeholder={!repDocType ? 'Selecione o tipo' : 'Digite o número'}
                      error={form.formState.errors.representativeDocumentNumber}
                      inputMode={repDocType === 'CPF' || repDocType === 'CNH' ? 'numeric' : 'text'}
                      maxLength={
                          repDocType === 'RG' ? 12 :
                          repDocType === 'CNH' ? 11 :
                          repDocType === 'CPF' ? 14 : 20
                      }
                      disabled={!repDocType}
                      formatter={
                          repDocType === 'CPF' ? formatCPF :
                          repDocType === 'RG' ? formatRG :
                          undefined
                      }
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/60 p-6">
              <CardHeader className='p-0 mb-4'>
                <CardTitle className='flex items-center gap-2'><ShoppingBag className="h-5 w-5 text-primary" />3. Detalhes do Pedido e Retirada</CardTitle>
                <CardDescription>Informe os dados referentes à compra que será retirada.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                  <FormDatePicker control={form.control} name="purchaseDate" label="Data da Compra *" error={form.formState.errors.purchaseDate} />
                  <FormDatePicker control={form.control} name="pickupDate" label="Data Prevista da Retirada *" error={form.formState.errors.pickupDate} onDateSelect={handlePickupDateSelect} />

                  <FormInput control={form.control} name="purchaseValue" label="Valor da Compra (R$) *" placeholder="Ex: 199,90" type="text" inputMode='decimal' error={form.formState.errors.purchaseValue} formatter={formatCurrency}/>
                  
                  <FormFieldItem>
                    <Label htmlFor="orderNumber">Número do Pedido *</Label>
                    <div className="flex items-center w-full">
                        <span className="inline-flex items-center px-3 h-11 text-sm text-foreground bg-muted border border-r-0 border-input rounded-l-md">
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
                                        "rounded-none w-full min-w-0 flex-1 focus:z-10",
                                        form.formState.errors.orderNumber ? 'border-destructive' : ''
                                    )}
                                    onChange={(e) => {
                                        const { value } = e.target;
                                        if (/^\d*$/.test(value)) {
                                            field.onChange(value);
                                        }
                                    }}
                                />
                            )}
                        />
                        <span className="inline-flex items-center px-3 h-11 text-sm text-foreground bg-muted border border-l-0 border-input rounded-r-md whitespace-nowrap">
                            RIHP-01
                        </span>
                    </div>
                    {form.formState.errors.orderNumber && <FormErrorMessage message={form.formState.errors.orderNumber.message} />}
                  </FormFieldItem>


                  <FormFieldItem className="md:col-span-2">
                      <Label htmlFor="pickupStore">Loja para Retirada *</Label>
                      <Controller
                          control={form.control}
                          name="pickupStore"
                          render={({ field }) => (
                          <Select onValueChange={field.onChange} value={field.value || undefined} disabled>
                              <SelectTrigger id="pickupStore" className={form.formState.errors.pickupStore ? 'border-destructive' : ''}>
                                  <SelectValue placeholder="Selecione uma loja" />
                              </SelectTrigger>
                              <SelectContent>
                              {storeOptionsList.map(option => (
                                  <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                              ))}
                              </SelectContent>
                          </Select>
                          )}
                      />
                      {form.formState.errors.pickupStore && <FormErrorMessage message={form.formState.errors.pickupStore.message} />}
                  </FormFieldItem>
                </div>
              </CardContent>
            </Card>

            <Separator/>
            
            <div className="space-y-6">
              <div className="text-left">
                  <h2 className="text-lg font-semibold text-foreground flex items-center gap-2"><FileCheck2 className="h-5 w-5 text-primary"/>Confirmação e Geração do PDF</h2>
              </div>
              
                <div className="bg-muted/50 p-4 rounded-md text-sm">
                    <h3 className="font-semibold text-base mb-2 flex items-center gap-2">Condições obrigatórias para retirada:</h3>
                    <ul className="list-disc list-inside space-y-1 text-foreground/90">
                        <li>O representante deverá ser maior de 18 anos.</li>
                        <li>Documento oficial com foto do representante deverá ser apresentado no ato da retirada.</li>
                        <li>Documento oficial com foto do comprador deverá ser enviado previamente ao WhatsApp ou e-mail da loja, juntamente com este termo digital.</li>
                        <li>Este termo digital deverá ser enviado à loja devidamente preenchido e validado.</li>
                        <li>Para comprador pessoa jurídica, deverá ser enviada previamente cópia ou imagem do Contrato Social ou Estatuto Social da empresa.</li>
                    </ul>
                    <p className="mt-2 text-foreground/90">A retirada estará condicionada à conferência documental pela equipe da loja.</p>
                </div>
              
              <Alert>
                  <ShieldAlert className="h-5 w-5 text-primary" />
                  <AlertTitle className="font-semibold">Tratamento de Dados Pessoais (LGPD)</AlertTitle>
                  <AlertDescription>Os dados informados neste formulário serão utilizados exclusivamente para gerar o documento PDF de autorização em seu próprio dispositivo. Nenhuma informação é armazenada em servidores ou compartilhada, em conformidade com a Lei Geral de Proteção de Dados (LGPD – Lei nº 13.709/2018).</AlertDescription>
              </Alert>

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
                                  className="mt-0.5"
                              />
                          )}
                      />
                      <div className="grid gap-1.5 leading-none">
                          <Label htmlFor="agreedToTerms" className="cursor-pointer">
                            Li e concordo com o tratamento dos meus dados pessoais conforme descrito acima.
                          </Label>
                      </div>
                  </div>
                  {form.formState.errors.agreedToTerms && <FormErrorMessage message={form.formState.errors.agreedToTerms.message} />}
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
                                  className="mt-0.5"
                              />
                          )}
                      />
                      <div className="grid gap-1.5 leading-none">
                          <Label htmlFor="agreedToRequirements" className="cursor-pointer">
                            Declaro estar ciente das exigências documentais para retirada por terceiros.
                          </Label>
                      </div>
                  </div>
                  {form.formState.errors.agreedToRequirements && <FormErrorMessage message={form.formState.errors.agreedToRequirements.message} />}
              </FormFieldItem>
            
              <Button type="submit" size="lg" className="w-full font-semibold text-base" disabled={isSubmitting || !agreedToTerms || !agreedToRequirements}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="animate-spin -ml-1 mr-3 h-5 w-5" />
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
          
          <AlertDialog open={showPostPdfModal} onOpenChange={setShowPostPdfModal}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex flex-col items-center justify-center gap-2 font-semibold text-xl text-center">
                  <FileCheck2 className="h-8 w-8 text-primary" />
                  PDF Gerado! Próximo Passo:
                </AlertDialogTitle>
                <div className="text-sm text-foreground/90 pt-2 text-center space-y-3">
                   <p>O seu PDF foi baixado! Agora você precisa enviá-lo para a loja.</p>
                   <p>Acesse a área de downloads do seu navegador (geralmente clicando no ícone de <strong>seta para baixo ↓</strong> ou no menu de <strong>3 pontinhos ⋮</strong>) e abra o arquivo.</p>
                   <p>Dentro do visualizador de PDF, procure pela opção <strong>"Compartilhar"</strong> e envie o arquivo para a loja junto com uma foto do seu documento.</p>
                </div>
              </AlertDialogHeader>
              <AlertDialogFooter className="flex-col sm:flex-col sm:space-x-0 gap-2">
                <Button asChild className="w-full bg-green-600 hover:bg-green-700 text-white">
                  <a href={`https://api.whatsapp.com/send/?phone=5511992011112&text=${getWhatsAppMessage()}&type=phone_number&app_absent=0`} target="_blank" rel="noopener noreferrer">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5 mr-2"><path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.3-1.38c1.45.79 3.08 1.21 4.7 1.21 5.46 0 9.91-4.45 9.91-9.91S17.5 2 12.04 2zM12.05 20.2c-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.81.83-3.04-.2-.31c-.82-1.31-1.26-2.83-1.26-4.41 0-4.54 3.7-8.23 8.24-8.23 2.22 0 4.28.86 5.82 2.41 1.55 1.54 2.41 3.6 2.41 5.82-.01 4.54-3.7 8.24-8.23 8.24zm4.52-6.13c-.25-.12-1.47-.72-1.7-.81-.23-.08-.39-.12-.56.12-.17.25-.64.81-.79.97-.15.17-.29.19-.54.06-.25-.12-1.06-.39-2.02-1.24-.75-.66-1.25-1.48-1.4-1.73-.14-.25-.02-.38.11-.51.11-.11.25-.29.37-.43.13-.14.17-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.41-.42-.56-.42-.14 0-.3 0-.46 0-.16 0-.41.06-.62.31-.22.25-.83.81-.83 1.98 0 1.16.85 2.3 1.05 2.5.14.17 1.67 2.56 4.05 3.55.57.23 1.02.37 1.37.47.59.17 1.13.15 1.56.09.48-.06 1.47-.6 1.67-1.18.21-.58.21-1.07.15-1.18-.06-.12-.22-.19-.47-.31z"/></svg>
                    Enviar PDF e Foto do Documento por WhatsApp
                  </a>
                </Button>
                <Button asChild variant="outline" className="w-full">
                  <a href={`mailto:loja187@rihappy.com.br?subject=${getEmailSubject()}&body=${getEmailBody()}`} target="_blank" rel="noopener noreferrer">
                    <Mail className="h-5 w-5 mr-2" />
                    Enviar PDF e Foto do Documento por E-mail
                  </a>
                </Button>
                <AlertDialogCancel>Fechar</AlertDialogCancel>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
      </CardContent>
       <footer className="mt-8 text-center text-xs text-muted-foreground w-full">
        <p>Ri Happy é uma empresa do Grupo Ri Happy S/A | CNPJ 58.731.662/0001-11</p>
        <p>Av. Eng. Luís Carlos Berrini, 105 – São Paulo/SP | <a href="mailto:atendimento@rihappy.com.br" className="hover:underline">atendimento@rihappy.com.br</a></p>
      </footer>
    </Card>
    
    <AuthorizationPdfTemplate
      pdfTemplateRef={pdfTemplateRef}
      generationTimestamp={generationTimestamp}
      getFullOrderNumber={getFullOrderNumber}
      form={form}
      signatureDataUrl={null}
    />
    </>
  );
}


// Helper components
const FormFieldItem: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <div className={cn("space-y-1.5", className)}>{children}</div>
);

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  control: Control<AuthorizationFormData>;
  name: keyof AuthorizationFormData;
  label: string;
  placeholder?: string;
  type?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'];
  error?: FieldError;
  className?: string;
  maxLength?: number;
  disabled?: boolean;
  tooltip?: string;
  formatter?: (value: string) => string;
}

const FormInput: React.FC<FormInputProps> = ({ control, name, label, placeholder, type = "text", inputMode, error, className, maxLength, disabled, tooltip, formatter, ...props }) => (
  <FormFieldItem className={className}>
      <div className="flex items-center gap-1.5">
        <Label htmlFor={name as string}>{label}</Label>
        {tooltip && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
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
      render={({ field }) => <Input 
        id={name as string} 
        type={type} 
        inputMode={inputMode} 
        placeholder={placeholder} 
        {...field} 
        {...props}
        onChange={(e) => {
            const value = e.target.value;
            field.onChange(formatter ? formatter(value) : value);
        }}
        value={field.value as string || ''}
        maxLength={maxLength} 
        className={error ? 'border-destructive' : ''} 
        disabled={disabled}
      />}
    />
    {error && <FormErrorMessage message={error.message} />}
  </FormFieldItem>
);

interface FormSelectProps {
    control: Control<AuthorizationFormData>;
    trigger: UseFormTrigger<AuthorizationFormData>;
    setValue: UseFormSetValue<AuthorizationFormData>;
    name: keyof AuthorizationFormData;
    label: string;
    placeholder: string;
    options: { value: string; label: string }[];
    error?: FieldError;
    className?: string;
}

const FormSelect: React.FC<FormSelectProps> = ({ control, trigger, setValue, name, label, placeholder, options, error, className }) => {
    return (
        <FormFieldItem className={className}>
            <Label htmlFor={name as string}>{label}</Label>
            <Controller
                control={control}
                name={name}
                render={({ field }) => (
                    <Select
                        onValueChange={(value) => {
                            field.onChange(value);
                            if (name === 'buyerDocumentType' || name === 'representativeDocumentType') {
                                const dependentField = name === 'buyerDocumentType' ? 'buyerDocumentNumber' : 'representativeDocumentNumber';
                                setValue(dependentField, '');
                                trigger(dependentField);
                            }
                        }}
                        value={field.value || undefined}
                    >
                        <SelectTrigger id={name as string} className={error ? 'border-destructive' : ''}>
                            <SelectValue placeholder={placeholder} />
                        </SelectTrigger>
                        <SelectContent>
                            {options.map(option => (
                                <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )}
            />
            {error && <FormErrorMessage message={error.message} />}
        </FormFieldItem>
    );
};


interface FormDatePickerProps {
  control: Control<AuthorizationFormData>;
  name: "purchaseDate" | "pickupDate";
  label: string;
  error?: FieldError;
  onDateSelect?: (date?: Date) => void;
}

const FormDatePicker: React.FC<FormDatePickerProps> = ({ control, name, label, error, onDateSelect }) => (
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
              variant={"outline"}
              className={cn(
                "w-full justify-start text-left font-normal",
                !field.value && "text-muted-foreground",
                error ? 'border-destructive' : ''
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {field.value ? format(field.value, "PPP", { locale: ptBR }) : <span>Selecione uma data</span>}
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

const FormItemRadio: React.FC<{ value: string; label: string; field: any }> = ({ value, label, field }) => (
  <div className="flex items-center space-x-2">
    <RadioGroupItem value={value} id={`${field.name}-${value}`} checked={field.value === value} />
    <Label htmlFor={`${field.name}-${value}`}>{label}</Label>
  </div>
);

const FormErrorMessage: React.FC<{ message?: string }> = ({ message }) => (
  message ? <p className="text-sm text-destructive">{message}</p> : null
);

export default AuthorizationForm;
    
    

    

    

    

    

    
