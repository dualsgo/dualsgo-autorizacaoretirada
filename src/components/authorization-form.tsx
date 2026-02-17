"use client";

import React, { useState, useRef, useEffect } from 'react';
import { useForm, Controller, SubmitHandler, useWatch, type Control, type FieldError, type UseFormTrigger } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { authorizationSchema, AuthorizationFormData, storeOptionsList, documentTypeOptionsBuyer, documentTypeOptionsRepresentative } from '@/lib/schemas';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon, HelpCircle, Mail, Download, Loader2, Link as LinkIcon, ExternalLink, ShieldAlert, FileText, FileCheck2, UserCheck, ShoppingBag } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tooltip, TooltipTrigger, TooltipProvider, TooltipContent } from '@/components/ui/tooltip';
import { Checkbox } from '@/components/ui/checkbox';
import Image from 'next/image';

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


const InitialModal = ({ open, onOpenChange, onContinue }: { open: boolean, onOpenChange: (open: boolean) => void, onContinue: () => void }) => {
  const [agreed, setAgreed] = useState(false);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-xl font-semibold">Autorização para Retirada por Terceiros – Formato Auxiliar</AlertDialogTitle>
          <AlertDialogDescription className="text-sm text-foreground/80 text-left pt-2 space-y-3">
            <p>Este formulário digital é um recurso auxiliar criado para facilitar o preenchimento da autorização de retirada por terceiros.</p>
            <p>As regras oficiais da modalidade “Retira em Loja” permanecem válidas e devem ser observadas conforme o regulamento disponível no site oficial da empresa.</p>
            <p>Caso prefira, você pode utilizar o modelo oficial de autorização disponibilizado pela empresa para impressão manual.</p>
            <p>O uso deste formulário não substitui as exigências previstas no regulamento oficial.</p>
          </AlertDialogDescription>
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

export function AuthorizationForm() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showGlobalError, setShowGlobalError] = useState(false);
  const [showPostPdfModal, setShowPostPdfModal] = useState(false);
  const pdfTemplateRef = useRef<HTMLDivElement>(null);
  const [isInitialModalOpen, setIsInitialModalOpen] = useState(false);
  const [generationTimestamp, setGenerationTimestamp] = useState<string | null>(null);

  useEffect(() => {
    const hasSeenModal = sessionStorage.getItem('hasSeenAuthFormModalV1');
    if (!hasSeenModal) {
      setIsInitialModalOpen(true);
    }
    // Set timestamp only on client-side after mount to prevent hydration mismatch
    setGenerationTimestamp(format(new Date(), "dd/MM/yyyy 'às' HH:mm:ss"));
  }, []);

  const handleContinueFromModal = () => {
    sessionStorage.setItem('hasSeenAuthFormModalV1', 'true');
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
      representativeName: '',
      representativeDocumentType: undefined,
      representativeDocumentNumber: '',
      purchaseValue: '',
      orderNumber: '',
      pickupStore: '1187 - CARIOCA SHOPPING',
      agreedToTerms: false,
    },
     mode: "onBlur",
  });

  const buyerType = form.watch('buyerType');
  const agreedToTerms = form.watch('agreedToTerms');
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


  const generatePdf = async () => {
    const pdfContentElement = pdfTemplateRef.current;
    if (!pdfContentElement) {
      toast({ title: "Erro", description: "Template do PDF não encontrado.", variant: "destructive" });
      return;
    }

    pdfContentElement.style.display = 'block';
    
    try {
      const canvas = await html2canvas(pdfContentElement, {
        scale: 2,
        useCORS: true,
        logging: false,
      });

      const imgData = canvas.toDataURL('image/png', 1.0);
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgProps = pdf.getImageProperties(imgData);
      const ratio = imgProps.height / imgProps.width;
      const imgHeight = pdfWidth * ratio;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, imgHeight);
      
      const pdfBlob = pdf.output('blob');
      const pdfFile = new File([pdfBlob], getPdfTitle(), { type: 'application/pdf' });
      
      if (navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
        await navigator.share({
          files: [pdfFile],
          title: `Autorização Pedido ${getFullOrderNumber()}`,
          text: `Segue o termo de autorização para o pedido ${getFullOrderNumber()}.`,
        });
        toast({ variant: "success", title: "Pronto para Enviar!", description: "Selecione o WhatsApp ou E-mail para compartilhar o PDF." });
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
    
    <Card className="w-full shadow-lg p-6 sm:p-8 md:p-10">
      <CardContent className="p-0">
          <div className="text-center mb-8">
            <Image 
              src="https://rihappynovo.vtexassets.com/arquivos/solzinhoFooterNew.png" 
              alt="Logo da Empresa" 
              width={64} 
              height={64} 
              className="mx-auto mb-4"
              data-ai-hint="company logo" />
            <h1 className="text-2xl font-bold text-foreground">
              Autorização para Retirada por Terceiros
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Este formulário é um recurso auxiliar para facilitar a autorização.
            </p>
          </div>

          <form 
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-10"
            noValidate
          >
            <div className="space-y-6">
              <div className="text-left">
                <h2 className="text-lg font-semibold text-foreground flex items-center gap-2"><FileText className="h-5 w-5 text-primary" />Dados do Titular da Compra</h2>
                <p className="text-sm text-muted-foreground mt-1">Preencha exatamente como no e-mail de confirmação do pedido.</p>
              </div>
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
                 <FormInput control={form.control} name="buyerEmail" label="E-mail do Comprador *" placeholder="comprador@exemplo.com" type="email" error={form.formState.errors.buyerEmail} />
                 <FormInput control={form.control} name="buyerPhone" label="Telefone do Comprador *" placeholder="(XX) XXXXX-XXXX" type="tel" error={form.formState.errors.buyerPhone} inputMode="tel" maxLength={15} formatter={formatPhone} tooltip="Com DDD." />
              </div>
            </div>

            <Separator/>
            
            <div className="space-y-6">
              <div className="text-left">
                <h2 className="text-lg font-semibold text-foreground flex items-center gap-2"><UserCheck className="h-5 w-5 text-primary" />Dados da Pessoa Autorizada a Retirar</h2>
                 <p className="text-sm text-muted-foreground mt-1">Essa pessoa precisa ser maior de idade e apresentar um documento original com foto na loja.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                <div className="md:col-span-2">
                 <FormInput control={form.control} name="representativeName" label="Nome Completo da Pessoa Autorizada *" placeholder="Maria Oliveira" error={form.formState.errors.representativeName} />
                </div>
                <FormSelect
                    control={form.control}
                    trigger={form.trigger}
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
            </div>

            <Separator/>

            <div className="space-y-6">
              <div className="text-left">
                <h2 className="text-lg font-semibold text-foreground flex items-center gap-2"><ShoppingBag className="h-5 w-5 text-primary" />Detalhes do Pedido e Retirada</h2>
                <p className="text-sm text-muted-foreground mt-1">Informe os dados referentes à compra que será retirada.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                <FormDatePicker control={form.control} name="purchaseDate" label="Data da Compra *" error={form.formState.errors.purchaseDate} />
                <FormDatePicker control={form.control} name="pickupDate" label="Data Prevista da Retirada *" error={form.formState.errors.pickupDate} />

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
            </div>

            <Separator/>
            
            <div className="space-y-6">
              <div className="text-left">
                  <h2 className="text-lg font-semibold text-foreground flex items-center gap-2"><FileCheck2 className="h-5 w-5 text-primary"/>Confirmação e Geração do PDF</h2>
              </div>
              <div className="bg-muted/50 p-4 rounded-md text-sm text-foreground">
                  <p className="font-semibold text-base mb-2 flex items-center gap-2"><ShieldAlert className="h-5 w-5 text-primary" />Tratamento de Dados Pessoais (LGPD)</p>
                  <p>Os dados informados neste formulário serão utilizados exclusivamente para gerar o documento PDF de autorização em seu próprio dispositivo. Nenhuma informação é armazenada em servidores ou compartilhada, em conformidade com a Lei Geral de Proteção de Dados (LGPD – Lei nº 13.709/2018).</p>
              </div>

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
                            Declaro que li as informações e concordo com o tratamento dos dados para a finalidade descrita.
                          </Label>
                      </div>
                  </div>
                  {form.formState.errors.agreedToTerms && <FormErrorMessage message={form.formState.errors.agreedToTerms.message} />}
              </FormFieldItem>
            
              <Button type="submit" size="lg" className="w-full font-semibold text-base" disabled={isSubmitting || !agreedToTerms}>
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
                <AlertDialogDescription className="text-foreground/90 pt-2 text-center space-y-3">
                  <p>O seu PDF foi baixado! Agora você precisa enviá-lo para a loja.</p>
                  <p>Acesse a área de downloads do seu navegador (geralmente clicando no ícone de <strong>seta para baixo ↓</strong> ou no menu de <strong>3 pontinhos ⋮</strong>) e abra o arquivo.</p>
                  <p>Dentro do visualizador de PDF, procure pela opção <strong>"Compartilhar"</strong> e envie o arquivo para a loja junto com uma foto do seu documento.</p>
                </AlertDialogDescription>
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

    <div ref={pdfTemplateRef} className="hidden" style={{ position: 'fixed', left: '-300mm', top: '0px', width: '210mm', height: 'auto', minHeight: '297mm', backgroundColor: '#FFFFFF', padding: '0', margin: '0', overflow: 'hidden' }}>
      <style>
        {`
          .pdf-page-container {
            width: 100%;
            height: 100%;
            padding: 20mm;
            box-sizing: border-box;
            font-family: 'Inter', Arial, sans-serif;
            font-size: 10pt;
            line-height: 1.5;
            background-color: #FFFFFF;
            color: #333333;
            display: flex;
            flex-direction: column;
          }
          .pdf-header { text-align: center; margin-bottom: 8mm; }
          .pdf-logo { max-width: 50px; height: auto; margin: 0 auto 3mm; }
          .pdf-main-title { font-size: 16pt; font-weight: 600; color: #000000; margin-bottom: 2mm; }
          .pdf-sub-title { font-size: 10pt; color: #555555; margin-bottom: 8mm; }
          .pdf-section { margin-bottom: 6mm; }
          .pdf-section-title { font-size: 11pt; font-weight: 600; color: #111827; padding-bottom: 2mm; border-bottom: 1px solid #EAEAEA; margin-bottom: 4mm; }
          .pdf-declaration { text-align: justify; margin-bottom: 6mm; }
          .pdf-data-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 3mm 6mm; }
          .pdf-data-item { display: flex; flex-direction: column; }
          .pdf-field-label { font-weight: 500; color: #555555; font-size: 8.5pt; margin-bottom: 1mm; }
          .pdf-field-value { font-size: 10pt; word-break: break-word; }
          .pdf-data-item.full-width { grid-column: span 2; }
          .pdf-signature-block { margin-top: 15mm; text-align: center; }
          .pdf-signature-line { width: 80%; border-top: 1px solid #333333; margin: 0 auto; }
          .pdf-signature-label { font-size: 9pt; margin-top: 2mm; }
          .pdf-footer { font-size: 8pt; color: #777777; text-align: center; margin-top: auto; padding-top: 5mm; border-top: 1px solid #EAEAEA; }
        `}
      </style>

      <div className="pdf-page-container">
        <div className="pdf-header">
          <img src="https://rihappynovo.vtexassets.com/arquivos/solzinhoFooterNew.png" alt="Logo Ri Happy" className="pdf-logo" data-ai-hint="company logo" />
          <div className="pdf-main-title">Termo de Autorização para Retirada por Terceiros</div>
          <div className="pdf-sub-title">Pedido: {getFullOrderNumber()}</div>
        </div>

        <div className="pdf-section">
          <p className="pdf-declaration">
            Eu, <strong>{form.getValues('buyerName')}</strong>, titular da compra, portador(a) do documento {form.getValues('buyerType') === 'individual' ? `${form.getValues('buyerDocumentType')} nº ${form.getValues('buyerDocumentNumber')}` : `CNPJ nº ${form.getValues('buyerCNPJ')}`}, autorizo pelo presente termo a pessoa <strong>{form.getValues('representativeName')}</strong>, portador(a) do documento {form.getValues('representativeDocumentType')} nº {form.getValues('representativeDocumentNumber')}, a retirar em meu nome o pedido mencionado acima na loja Ri Happy designada.
          </p>
        </div>

        <div className="pdf-section">
          <div className="pdf-section-title">Dados do Titular da Compra</div>
          <div className="pdf-data-grid">
            <div className="pdf-data-item full-width">
              <span className="pdf-field-label">{form.getValues('buyerType') === 'individual' ? 'Nome Completo' : 'Razão Social'}</span>
              <div className="pdf-field-value">{form.getValues('buyerName')}</div>
            </div>
            {form.getValues('buyerType') === 'individual' ? (
              <>
                <div className="pdf-data-item">
                  <span className="pdf-field-label">CPF</span>
                  <div className="pdf-field-value">{form.getValues('buyerCPF')}</div>
                </div>
                <div className="pdf-data-item">
                  <span className="pdf-field-label">{form.getValues('buyerDocumentType')}</span>
                  <div className="pdf-field-value">{form.getValues('buyerDocumentNumber')}</div>
                </div>
              </>
            ) : (
              <div className="pdf-data-item full-width">
                <span className="pdf-field-label">CNPJ</span>
                <div className="pdf-field-value">{form.getValues('buyerCNPJ')}</div>
              </div>
            )}
            <div className="pdf-data-item"><span className="pdf-field-label">E-mail</span><div className="pdf-field-value">{form.getValues('buyerEmail')}</div></div>
            <div className="pdf-data-item"><span className="pdf-field-label">Telefone</span><div className="pdf-field-value">{form.getValues('buyerPhone')}</div></div>
          </div>
        </div>
        
        <div className="pdf-section">
          <div className="pdf-section-title">Dados da Pessoa Autorizada</div>
          <div className="pdf-data-grid">
            <div className="pdf-data-item full-width"><span className="pdf-field-label">Nome Completo</span><div className="pdf-field-value">{form.getValues('representativeName')}</div></div>
            <div className="pdf-data-item full-width"><span className="pdf-field-label">{form.getValues('representativeDocumentType')}</span><div className="pdf-field-value">{form.getValues('representativeDocumentNumber')}</div></div>
          </div>
        </div>

        <div className="pdf-section">
          <div className="pdf-section-title">Dados do Pedido</div>
          <div className="pdf-data-grid">
            <div className="pdf-data-item"><span className="pdf-field-label">Data da Compra</span><div className="pdf-field-value">{form.getValues('purchaseDate') ? format(form.getValues('purchaseDate')!, 'dd/MM/yyyy') : ''}</div></div>
            <div className="pdf-data-item"><span className="pdf-field-label">Data da Retirada</span><div className="pdf-field-value">{form.getValues('pickupDate') ? format(form.getValues('pickupDate')!, 'dd/MM/yyyy') : ''}</div></div>
            <div className="pdf-data-item"><span className="pdf-field-label">Valor Total</span><div className="pdf-field-value">R$ {form.getValues('purchaseValue').replace('.', ',')}</div></div>
            <div className="pdf-data-item"><span className="pdf-field-label">Loja de Retirada</span><div className="pdf-field-value">{form.getValues('pickupStore')}</div></div>
          </div>
        </div>

        <div className="pdf-signature-block">
          <div className="pdf-signature-line"></div>
          <p className="pdf-signature-label">Assinatura do Titular da Compra</p>
        </div>

        <div className="pdf-footer">
            Gerado em: {generationTimestamp} <br/>
            Documento auxiliar sujeito à conferência conforme regulamento oficial. A retirada só será autorizada mediante apresentação deste termo junto com a cópia do documento do titular e documento original do autorizado.
        </div>
      </div>
    </div>
    </>
  );
}


// Helper components
const FormFieldItem: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <div className={cn("space-y-1.5", className)}>{children}</div>
);

interface FormInputProps {
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

const FormInput: React.FC<FormInputProps> = ({ control, name, label, placeholder, type = "text", inputMode, error, className, maxLength, disabled, tooltip, formatter }) => (
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
    name: keyof AuthorizationFormData;
    label: string;
    placeholder: string;
    options: { value: string; label: string }[];
    error?: FieldError;
    className?: string;
}

const FormSelect: React.FC<FormSelectProps> = ({ control, trigger, name, label, placeholder, options, error, className }) => (
    <FormFieldItem className={className}>
        <Label htmlFor={name as string}>{label}</Label>
        <Controller
            control={control}
            name={name}
            render={({ field }) => (
                <Select onValueChange={(value) => {
                    field.onChange(value);
                    if (name === 'buyerDocumentType' || name === 'representativeDocumentType') {
                        const dependentField = (name === 'buyerDocumentType' ? 'buyerDocumentNumber' : 'representativeDocumentNumber') as keyof AuthorizationFormData;
                        form.setValue(dependentField, '');
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


interface FormDatePickerProps {
  control: Control<AuthorizationFormData>;
  name: "purchaseDate" | "pickupDate";
  label: string;
  error?: FieldError;
}

const FormDatePicker: React.FC<FormDatePickerProps> = ({ control, name, label, error }) => (
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
              onSelect={field.onChange}
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

const Separator = () => <div className="border-t border-border/60 my-6" />;

export default AuthorizationForm;
