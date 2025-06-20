
"use client";

import React, { useState, useRef, useEffect } from 'react';
import { useForm, Controller, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { authorizationSchema, AuthorizationFormData, storeOptionsList } from '@/lib/schemas';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileUploader } from '@/components/file-uploader';
import { SignaturePad } from '@/components/signature-pad';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon, FileText, User, Users, ShoppingBag } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export function AuthorizationForm() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const pdfTemplateRef = useRef<HTMLDivElement>(null);
  
  const [buyerIdPreview, setBuyerIdPreview] = useState<string | null>(null);
  const [socialContractPreview, setSocialContractPreview] = useState<string | null>(null);
  const [signaturePreview, setSignaturePreview] = useState<string | null>(null);


  const form = useForm<AuthorizationFormData>({
    resolver: zodResolver(authorizationSchema),
    defaultValues: {
      buyerType: 'individual',
      buyerName: '',
      buyerRG: '',
      buyerCPF: '',
      buyerCNPJ: '',
      // Address fields removed
      representativeName: '',
      representativeRG: '',
      representativeCPF: '',
      purchaseValue: '',
      orderNumber: '',
      pickupStore: undefined, 
      buyerSignature: '',
      buyerIdDocument: null,
      socialContractDocument: null,
    },
  });

  const buyerType = form.watch('buyerType');

  useEffect(() => {
    if (buyerType === 'individual') {
        form.resetField('buyerCNPJ');
        form.resetField('socialContractDocument');
        setSocialContractPreview(null);
    } else {
        form.resetField('buyerRG');
        form.resetField('buyerCPF');
    }
    form.clearErrors(['buyerRG', 'buyerCPF', 'buyerCNPJ', 'socialContractDocument']);
  }, [buyerType, form]);

  const generatePdf = async () => {
    const pdfContentElement = pdfTemplateRef.current;
    if (!pdfContentElement) {
      toast({ title: "Erro", description: "Template do PDF não encontrado.", variant: "destructive" });
      return;
    }
    
    pdfContentElement.style.display = 'block';
    pdfContentElement.style.position = 'fixed'; 
    pdfContentElement.style.left = '-9999px'; 
    pdfContentElement.style.top = '0px';
    pdfContentElement.style.width = '210mm'; 
    pdfContentElement.style.height = '297mm';
    pdfContentElement.style.backgroundColor = '#ffffff';
    pdfContentElement.style.padding = '0';
    pdfContentElement.style.margin = '0';
    
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    pdfContentElement.offsetHeight;

    try {
      const canvas = await html2canvas(pdfContentElement, {
        scale: 2, 
        useCORS: true,
        logging: false,
        width: pdfContentElement.scrollWidth,
        height: pdfContentElement.scrollHeight,
        windowWidth: pdfContentElement.scrollWidth,
        windowHeight: pdfContentElement.scrollHeight,
      });
      
      const imgData = canvas.toDataURL('image/png', 0.95); 
      const pdf = new jsPDF('p', 'mm', 'a4', true); 
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      const imgProps = pdf.getImageProperties(imgData);
      const aspectRatio = imgProps.width / imgProps.height;

      let imgRenderWidth = pdfWidth;
      let imgRenderHeight = pdfWidth / aspectRatio;

      if (imgRenderHeight > pdfHeight) {
        imgRenderHeight = pdfHeight;
        imgRenderWidth = pdfHeight * aspectRatio;
      }
      
      const xOffset = (pdfWidth - imgRenderWidth) / 2;
      const yOffset = (pdfHeight - imgRenderHeight) / 2;

      pdf.addImage(imgData, 'PNG', xOffset, yOffset, imgRenderWidth, imgRenderHeight, undefined, 'FAST');
      pdf.save('autorizacao_retirada.pdf');
      toast({ title: "Sucesso!", description: "PDF gerado e download iniciado." });

    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      toast({ title: "Erro ao gerar PDF", description: "Ocorreu um problema ao tentar gerar o documento.", variant: "destructive" });
    } finally {
       if (pdfContentElement) {
        pdfContentElement.style.display = 'none'; 
        pdfContentElement.style.position = 'absolute'; 
       }
    }
  };

  const readFileAsDataURL = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const onSubmit: SubmitHandler<AuthorizationFormData> = async (data) => {
    setIsSubmitting(true);
    
    try {
      let buyerIdDataUrl: string | null = null;
      if (data.buyerIdDocument) {
        buyerIdDataUrl = await readFileAsDataURL(data.buyerIdDocument);
      }
  
      let socialContractDataUrl: string | null = null;
      if (data.socialContractDocument && data.buyerType === 'corporate') {
        socialContractDataUrl = await readFileAsDataURL(data.socialContractDocument);
      }
      
      await new Promise<void>(resolve => {
        setBuyerIdPreview(buyerIdDataUrl);
        setSocialContractPreview(socialContractDataUrl);
        setSignaturePreview(data.buyerSignature || null);
        requestAnimationFrame(() => setTimeout(resolve, 50)); 
      });
            
      await generatePdf();

    } catch (error) {
      console.error("Erro no processo de submissão:", error);
      toast({ title: "Erro na submissão", description: "Falha ao processar os dados para PDF.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8 max-w-4xl">
      <Card className="shadow-xl">
        <CardHeader className="bg-primary/10">
          <CardTitle className="text-3xl font-headline text-center text-primary-foreground">
            🎉 A diversão continua com você!
          </CardTitle>
          <CardDescription className="text-center text-primary-foreground/80 space-y-2 mt-2">
            <p>Para garantir a segurança da sua compra, preencha o Termo de Autorização caso outra pessoa vá retirar seu pedido.</p>
            <p>Essa etapa é importante para proteger sua compra e garantir que tudo ocorra da forma mais segura possível 😉</p>
            <p className="font-semibold">Atenção: você tem até 15 dias para retirar o pedido na loja escolhida. Após esse prazo, o pedido será cancelado e o pagamento estornado automaticamente.</p>
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-8">
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-headline"><User className="text-primary" /> Dados do Comprador</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormFieldItem className="md:col-span-2">
                  <Label>Tipo de Comprador</Label>
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
                  <FormInput control={form.control} name="buyerName" label="Nome / Razão Social" placeholder="João Silva / Empresa XYZ LTDA" error={form.formState.errors.buyerName} />
                </div>

                {buyerType === 'individual' && (
                  <>
                    <FormInput control={form.control} name="buyerRG" label="RG" placeholder="00.000.000-0" error={form.formState.errors.buyerRG} />
                    <FormInput control={form.control} name="buyerCPF" label="CPF" placeholder="000.000.000-00" error={form.formState.errors.buyerCPF} />
                  </>
                )}
                {buyerType === 'corporate' && (
                  <FormInput control={form.control} name="buyerCNPJ" label="CNPJ" placeholder="00.000.000/0000-00" error={form.formState.errors.buyerCNPJ} />
                )}
                {/* Address fields removed from UI */}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-headline"><Users className="text-primary" /> Dados da pessoa autorizada a retirar</CardTitle>
                <CardDescription>Essa pessoa precisa apresentar o PDF desta autorização na loja.</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                 <FormInput control={form.control} name="representativeName" label="Nome / Razão Social" placeholder="Maria Oliveira" error={form.formState.errors.representativeName} />
                </div>
                <FormInput control={form.control} name="representativeRG" label="RG" placeholder="11.111.111-1" error={form.formState.errors.representativeRG} />
                <FormInput control={form.control} name="representativeCPF" label="CPF" placeholder="111.111.111-11" error={form.formState.errors.representativeCPF} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-headline"><ShoppingBag className="text-primary" /> Detalhes da Compra e Retirada</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormDatePicker control={form.control} name="purchaseDate" label="Data da Compra" error={form.formState.errors.purchaseDate} />
                <FormInput control={form.control} name="purchaseValue" label="Valor da Compra (R$)" placeholder="199,90" type="text" inputMode='decimal' error={form.formState.errors.purchaseValue} />
                <FormInput control={form.control} name="orderNumber" label="Número do Pedido" placeholder="V12345678RIHP-01" error={form.formState.errors.orderNumber} />
                
                <FormFieldItem className="md:col-span-2">
                    <Label htmlFor="pickupStore">Loja para Retirada</Label>
                    <Controller
                        control={form.control}
                        name="pickupStore"
                        render={({ field }) => (
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
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

                <div className="md:col-span-2">
                    <FormDatePicker control={form.control} name="pickupDate" label="Data Prevista da Retirada" error={form.formState.errors.pickupDate} />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-headline"><FileText className="text-primary" /> Documentos e Assinatura</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <Controller
                    control={form.control}
                    name="buyerIdDocument"
                    render={({ field: { onChange, value, ...restField }}) => (
                        <FileUploader
                            id="buyerIdDocument"
                            label="Identidade do Comprador (Frente e Verso)"
                            description="Documento de identidade é obrigatório. Formatos: JPG, PNG. Max: 5MB."
                            onFileChange={onChange}
                            accept="image/jpeg,image/png"
                            fileError={form.formState.errors.buyerIdDocument?.message as string | undefined}
                        />
                    )}
                />
                {buyerType === 'corporate' && (
                     <Controller
                        control={form.control}
                        name="socialContractDocument"
                        render={({ field: { onChange, value, ...restField } }) => (
                            <FileUploader
                                id="socialContractDocument"
                                label="Contrato Social / Estatuto Social Autenticado"
                                description="Contrato social é obrigatório para Pessoa Jurídica. Formatos: PDF, JPG, PNG. Max: 5MB."
                                onFileChange={onChange}
                                accept="application/pdf,image/jpeg,image/png"
                                fileError={form.formState.errors.socialContractDocument?.message as string | undefined}
                            />
                        )}
                    />
                )}
                 <Controller
                  control={form.control}
                  name="buyerSignature"
                  render={({ field }) => (
                    <SignaturePad
                      id="buyerSignature"
                      label="Assinatura do Comprador (Obrigatória)"
                      onSignatureChange={(dataUrl) => field.onChange(dataUrl)}
                      signatureError={form.formState.errors.buyerSignature?.message}
                      width={typeof window !== 'undefined' ? Math.min(window.innerWidth - 80, 450) : 450} 
                      height={150} 
                    />
                  )}
                />
              </CardContent>
            </Card>

            <Button type="submit" size="lg" className="w-full font-headline bg-accent hover:bg-accent/90 text-accent-foreground text-lg" disabled={isSubmitting}>
              {isSubmitting ? 'Gerando PDF...' : 'Gerar PDF e Baixar'}
            </Button>
          </form>
        </CardContent>
      </Card>
      
      {/* PDF Template - Hidden from view, used for PDF generation */}
      <div ref={pdfTemplateRef} className="hidden" style={{ width: '210mm', height: '297mm', boxSizing: 'border-box', backgroundColor: 'white', color: 'black', fontFamily: 'Arial, sans-serif' }}>
        <style>
          {`
            @page { 
              size: A4;
              margin: 0; 
            }
            body { /* Applied to the body *inside* this div if html2canvas processes it that way */
              margin: 0; 
              color: black;
              font-family: Arial, sans-serif;
            }
            .pdf-page-container {
              width: 100%; 
              height: 100%; 
              padding: 10mm; 
              box-sizing: border-box;
              font-size: 9pt; /* Slightly reduced for more space */
              line-height: 1.3; /* Reduced line height */
              display: flex;
              flex-direction: column;
            }
            .pdf-header { 
              text-align: center; 
              margin-bottom: 5mm; /* Reduced */
            }
            .pdf-logo { 
              max-width: 70px; /* Reduced logo size */
              margin: 0 auto 3mm auto; /* Reduced margin */
            }
            .pdf-main-title { 
              font-size: 11pt; /* Reduced */
              font-weight: bold; 
              margin-bottom: 4mm; /* Reduced */
              text-transform: uppercase;
              text-align: center;
            }

            .pdf-data-section { 
              margin-bottom: 4mm; /* Reduced */
            }
            .pdf-data-section-title {
              font-size: 10pt; /* Reduced */
              font-weight: bold;
              margin-bottom: 2mm; /* Reduced */
              padding-bottom: 0.5mm;
              /* border-bottom: 1px solid #eee; Removed as per last request */
            }
            .pdf-data-content {
              display: grid;
              grid-template-columns: max-content 1fr; 
              gap: 1.5mm 3mm; /* Reduced gap */
            }
            .pdf-field-label {
              font-weight: 600; 
              white-space: nowrap;
              padding-right: 1mm; 
            }
            .pdf-field-value {
              word-break: break-word;
              min-height: 1em; 
              /* border-bottom: 0.5px solid #333; Removed underline */
              /* padding-bottom: 0.5mm; Removed padding for underline */
            }
            .pdf-field-group { 
                display: flex;
                align-items: baseline;
             }
             .pdf-field-group .pdf-field-label {
                margin-left: 5mm; 
             }
             .pdf-field-group .pdf-field-value {
                 flex-grow: 1;
                 min-width: 0; 
                 /* border-bottom: 0.5px solid #333; Removed underline */
                 /* padding-bottom: 0.5mm; Removed padding for underline */
             }
            .full-width-label { /* For Nome/Razão Social and Endereço labels */
                grid-column: 1 / -1;
                font-weight: bold;
                margin-bottom: -1mm; /* Pull value closer */
            }
            .full-width-value { /* For Nome/Razão Social and Endereço values */
                 grid-column: 1 / -1;
                 margin-bottom: 1mm; /* Space after full-width value */
            }


            .pdf-text-block { 
              margin: 4mm 0; /* Reduced */
              font-size: 8.5pt; /* Reduced */
              text-align: justify;
            }
            .pdf-text-block p { 
              margin-bottom: 1.5mm; /* Reduced */
            }
            .pdf-text-block strong { 
              font-weight: bold; 
            }
            .pdf-text-block ul { 
              list-style-type: disc; 
              padding-left: 5mm; 
              margin-bottom: 1.5mm; 
            }
             .pdf-text-block li {
              margin-bottom: 0.5mm;
            }

            .pdf-order-table { 
              width: 100%; 
              border-collapse: collapse; 
              margin-bottom: 4mm; 
              font-size: 8.5pt; /* Reduced */
            }
            .pdf-order-table th { 
              font-weight: bold; 
              text-align: left;
              padding: 0.5mm 0; /* Reduced padding */
            }
            .pdf-order-table td { 
              padding: 0.5mm 0; /* Reduced padding */
            }
             .pdf-order-table tr:not(:last-child) th,
             .pdf-order-table tr:not(:last-child) td {
                padding-bottom: 1mm; /* Reduced */
            }

            .pdf-signature-and-id-section {
                display: flex;
                justify-content: space-between;
                align-items: flex-start; /* Align tops */
                margin-top: 4mm;
                margin-bottom: 4mm;
                gap: 4mm; /* Space between ID and Signature */
            }
            .pdf-document-item-inline, .pdf-signature-item-inline {
                flex: 1; /* Each takes half the space */
                display: flex;
                flex-direction: column;
            }
            .pdf-document-title, .pdf-signature-label { 
              font-weight: bold;
              font-size: 9pt; /* Reduced */
              margin-bottom: 1mm; /* Reduced */
              text-align: center; /* Center titles */
            }
            .pdf-document-image-wrapper, .pdf-signature-box { 
              margin-top: 1mm; /* Reduced */
              width: 100%; 
              height: 35mm; /* Defined height for consistency */
              display: flex; 
              align-items: center; 
              justify-content: center; 
              box-sizing: border-box;
              border: 1px dashed #ccc; /* Optional: visual guide for image area */
            }
             .pdf-document-image-wrapper img, .pdf-signature-box img {
                max-height: 100%;
                max-width: 100%;
                object-fit: contain;
             }
            
            .pdf-social-contract-section {
                margin-top: 4mm;
            }
            .pdf-social-contract-section .pdf-document-image-wrapper {
                height: 40mm; /* Slightly more height for social contract if needed */
            }
            
            .pdf-document-placeholder {
                font-size: 8pt; color: #777; text-align: center; padding: 10mm 0;
            }

            .pdf-final-disclaimer { 
              font-size: 7.5pt; /* Reduced */
              margin-top: auto; 
              padding-top: 2mm; 
              text-align: left;
              /* border-top: 1px solid #eee;  Removed as per last request */
            }
          `}
        </style>
        <div className="pdf-page-container">
          <div className="pdf-header">
            <img src="https://placehold.co/80x28.png" alt="Logo" className="pdf-logo" data-ai-hint="brand logo" />
            <div className="pdf-main-title">TERMO DE AUTORIZAÇÃO PARA RETIRADA POR TERCEIROS</div>
          </div>

          <div className="pdf-data-section">
            <div className="pdf-data-section-title">DADOS DO COMPRADOR</div>
            <div className="pdf-data-content">
              <span className="full-width-label" style={{gridColumn: '1 / -1', fontWeight:'bold'}}>Nome/Razão Social:</span>
              <span className="pdf-field-value full-width-value" style={{gridColumn: '1 / -1'}}>{form.getValues('buyerName') || ' '}</span>
              
              {form.getValues('buyerType') === 'individual' ? (
                <>
                  <span className="pdf-field-label">RG:</span>
                  <div className="pdf-field-group">
                     <span className="pdf-field-value">{form.getValues('buyerRG') || ' '}</span>
                     <span className="pdf-field-label">CPF:</span>
                     <span className="pdf-field-value">{form.getValues('buyerCPF') || ' '}</span>
                  </div>
                </>
              ) : (
                <>
                  <span className="pdf-field-label">CNPJ:</span>
                  <span className="pdf-field-value">{form.getValues('buyerCNPJ') || ' '}</span>
                </>
              )}
              {/* Address fields removed from PDF */}
            </div>
          </div>

          <div className="pdf-data-section">
            <div className="pdf-data-section-title">DADOS DA PESSOA AUTORIZADA A RETIRAR</div>
            <div className="pdf-data-content">
              <span className="full-width-label" style={{gridColumn: '1 / -1', fontWeight:'bold'}}>Nome:</span>
              <span className="pdf-field-value full-width-value" style={{gridColumn: '1 / -1'}}>{form.getValues('representativeName') || ' '}</span>
              
              <span className="pdf-field-label">RG:</span>
              <div className="pdf-field-group">
                <span className="pdf-field-value">{form.getValues('representativeRG') || ' '}</span>
                <span className="pdf-field-label">CPF:</span>
                <span className="pdf-field-value">{form.getValues('representativeCPF') || ' '}</span>
              </div>
            </div>
          </div>
          
          <div className="pdf-text-block">
            <p>O comprador autoriza o representante identificado acima a retirar os produtos do pedido na loja escolhida no momento da compra no site.</p>
            <p>Para realizar a retirada, o representante deve:</p>
            <ul>
              <li>Ter mais de 18 anos;</li>
              <li>Apresentar um documento oficial com foto;</li>
              <li>Apresentar o PDF da autorização gerado pelo comprador (não é necessário imprimir);</li>
              <li>Levar uma cópia do documento de identidade do comprador.</li>
            </ul>
            <p><strong>📨 Importante:</strong> O comprador deve enviar o PDF da autorização para o WhatsApp ou e-mail da loja, garantindo que um colaborador da loja confirme o recebimento.</p>
            <p>Se o comprador for uma pessoa jurídica, também é necessário apresentar uma foto ou cópia autenticada do Contrato Social ou Estatuto Social da empresa.</p>
            <p><strong>⚠️ A retirada deve ser feita dentro do horário de funcionamento da loja escolhida.</strong></p>
          </div>

          <div className="pdf-data-section">
            <div className="pdf-data-section-title">DETALHES DO PEDIDO</div>
            <table className="pdf-order-table">
              <thead>
                <tr>
                  <th>Data da Compra</th>
                  <th>Valor da Compra</th>
                  <th>Nº do Pedido</th>
                  <th>Loja para Retirada</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>{form.getValues('purchaseDate') ? format(form.getValues('purchaseDate'), 'dd/MM/yyyy', { locale: ptBR }) : ' '}</td>
                  <td>R$ {(form.getValues('purchaseValue') || ' ').replace(',', '.')}</td>
                  <td>{form.getValues('orderNumber') || ' '}</td>
                  <td>{storeOptionsList.find(s => s.value === form.getValues('pickupStore'))?.label || form.getValues('pickupStore') || ' '}</td>
                </tr>
              </tbody>
            </table>
          </div>
          
          <div className="pdf-field-label" style={{fontWeight: 'bold', fontSize: '9pt'}}>Data prevista para retirada:</div>
          <div className="pdf-field-value" style={{marginBottom: '4mm'}}>
            {form.getValues('pickupDate') ? format(form.getValues('pickupDate'), 'dd / MM / yyyy', { locale: ptBR }) : '_____ / _____ / _____'}
          </div>
            
          <div className="pdf-signature-and-id-section">
             <div className="pdf-document-item-inline">
                <div className="pdf-document-title">DOCUMENTO DE IDENTIDADE DO COMPRADOR</div>
                <div className="pdf-document-image-wrapper">
                    {buyerIdPreview ? (
                    <img src={buyerIdPreview} alt="Identidade do Comprador" />
                    ) : <p className="pdf-document-placeholder">Documento não fornecido.</p>}
                </div>
            </div>
            <div className="pdf-signature-item-inline">
                <div className="pdf-signature-label">Assinatura do comprador:</div>
                <div className="pdf-signature-box">
                {signaturePreview ? (
                    <img src={signaturePreview} alt="Assinatura do Comprador" />
                ) : <span className="pdf-document-placeholder">(Assinatura não fornecida)</span>}
                </div>
            </div>
          </div>
          
          {form.getValues('buyerType') === 'corporate' && (
            <div className="pdf-social-contract-section">
              <div className="pdf-document-title">CONTRATO SOCIAL / ESTATUTO SOCIAL</div>
              <div className="pdf-document-image-wrapper">
                {socialContractPreview ? (
                    socialContractPreview.startsWith('data:image') ? 
                    <img src={socialContractPreview} alt="Contrato Social" /> :
                    <p className="pdf-document-placeholder">Contrato Social (PDF) - Preview não disponível para PDF neste template.</p>
                ) : <p className="pdf-document-placeholder">Documento não fornecido.</p>}
              </div>
            </div>
          )}
          
          <div className="pdf-final-disclaimer">
            (*) Os documentos mencionados e obrigatórios para entrega do(s) produto(s), não serão retidos em loja, após a conferência, serão devolvidos ao terceiro autorizado.
          </div>
        </div>
      </div>

    </div>
  );
}


// Helper components for cleaner form structure
const FormFieldItem: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <div className={cn("space-y-1", className)}>{children}</div>
);

interface FormInputProps {
  control: any;
  name: keyof AuthorizationFormData | string;
  label: string;
  placeholder?: string;
  type?: string;
  inputMode?: "text" | "search" | "email" | "tel" | "url" | "none" | "numeric" | "decimal" | undefined;
  error?: { message?: string };
  className?: string;
  maxLength?: number;
}

const FormInput: React.FC<FormInputProps> = ({ control, name, label, placeholder, type = "text", inputMode, error, className, maxLength }) => (
  <FormFieldItem className={className}>
    <Label htmlFor={name as string}>{label}</Label>
    <Controller
      control={control}
      name={name as keyof AuthorizationFormData} 
      render={({ field }) => <Input id={name as string} type={type} inputMode={inputMode} placeholder={placeholder} {...field} value={field.value || ''} maxLength={maxLength} className={error ? 'border-destructive' : ''} />}
    />
    {error && <FormErrorMessage message={error.message} />}
  </FormFieldItem>
);

interface FormDatePickerProps {
  control: any;
  name: "purchaseDate" | "pickupDate";
  label: string;
  error?: { message?: string };
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
              {field.value ? format(new Date(field.value), "PPP", { locale: ptBR }) : <span>Selecione uma data</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={field.value as Date | undefined}
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
  <p className="text-sm text-destructive">{message}</p>
);

export default AuthorizationForm;
