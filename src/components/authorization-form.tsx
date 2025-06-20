
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
    pdfContentElement.style.minHeight = '297mm'; // Use minHeight to allow content to expand if needed
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
                <FormInput control={form.control} name="purchaseValue" label="Valor da Compra (R$)" placeholder="199.90" type="text" inputMode='decimal' error={form.formState.errors.purchaseValue} />
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
      
      {/* PDF Template - hidden, used for generation */}
      <div ref={pdfTemplateRef} className="hidden">
        <style>
          {`
            @page { 
              size: A4;
              margin: 0; 
            }
            body { /* Applied by html2canvas to the capture region, not document body */
              margin: 0; 
              color: #333333; /* Default dark gray for text */
              font-family: 'Roboto', Arial, sans-serif;
              background-color: #FFFFFF; /* Ensure background is white for capture */
            }
            .pdf-page-container {
              width: 210mm; 
              min-height: 297mm; /* Ensure it tries to fill A4 */
              padding: 15mm; /* Margins: reduced from 20mm to 15mm for more content space */
              box-sizing: border-box;
              font-size: 10pt; /* Base font size */
              line-height: 1.4; /* Slightly increased line spacing */
              background-color: #FFFFFF;
            }

            /* HEADER */
            .pdf-header { 
              text-align: center; 
              margin-bottom: 8mm; 
            }
            .pdf-logo { 
              max-width: 70px; /* Slightly smaller logo */
              height: auto;
              margin-bottom: 4mm;
            }
            .pdf-main-title { 
              font-size: 16pt; /* Adjusted from 18pt */
              font-weight: bold; 
              text-transform: uppercase;
              margin-bottom: 5mm; 
              padding-bottom: 2mm;
              border-bottom: 1px solid #DDDDDD; /* Discrete line */
              color: #000000; /* Black title */
            }

            /* DATA SECTIONS (COMPRADOR, REPRESENTANTE) */
            .pdf-data-section { 
              background-color: #f9f9f9; /* Light gray background for card */
              border: 1px solid #DDDDDD; /* Soft border for card */
              border-radius: 3px;
              padding: 0; /* Padding will be on title and content */
              margin-bottom: 7mm; /* Increased spacing between sections */
              overflow: hidden; /* To contain floated elements or ensure border radius applies */
            }
            .pdf-data-section-title {
              font-size: 12pt; /* Adjusted from 14pt */
              font-weight: bold;
              color: #FFFFFF; /* White text */
              background-color: #4A4A4A; /* Darker gray background for title bar */
              padding: 2.5mm 4mm;
              margin: 0; /* Reset margin for the title bar */
              text-align: left;
            }
            .pdf-data-content-wrapper {
              padding: 4mm; /* Padding inside the card, below title */
            }
            .pdf-data-grid {
              display: grid;
              grid-template-columns: repeat(2, 1fr); /* Two columns */
              gap: 2mm 6mm; /* Row gap, Column gap */
            }
            .pdf-data-grid-item {
              /* Each item takes one cell, label+value on same line where possible */
            }
            .pdf-data-grid-item.full-width {
              grid-column: span 2; /* For items like Name, CNPJ to span both columns */
            }
            .pdf-field-label {
              font-weight: bold;
              display: inline;
              color: #000000;
            }
            .pdf-field-value {
              display: inline;
              margin-left: 1.5mm;
              word-break: break-word;
              color: #000000;
            }
            
            /* INSTRUCTIONS BLOCK */
            .pdf-text-block { 
              margin: 7mm 0; 
              font-size: 9pt; /* Slightly smaller for dense text */
              text-align: left; 
              color: #000000;
            }
            .pdf-text-block p { 
              margin-bottom: 2.5mm; 
            }
            .pdf-text-block strong { 
              font-weight: bold; 
            }
            .pdf-text-block ul { 
              list-style-position: outside;
              padding-left: 5mm; 
              margin-top: 1mm;
              margin-bottom: 2.5mm;
            }
            .pdf-text-block li {
              margin-bottom: 1.5mm;
            }

            /* ORDER DETAILS TABLE */
            .pdf-order-details-section-title {
              font-size: 12pt; /* Consistent with other section titles */
              font-weight: bold;
              margin-bottom: 3mm;
              color: #000000;
            }
            .pdf-order-table { 
              width: 100%; 
              border-collapse: collapse; 
              margin-bottom: 5mm; 
              font-size: 9pt; /* Smaller for table data */
            }
            .pdf-order-table th, .pdf-order-table td { 
              border: 1px solid #DDDDDD; /* Discrete borders for table */
              padding: 2mm; 
              text-align: left;
              color: #000000;
            }
            .pdf-order-table th {
              font-weight: bold;
              background-color: #f0f0f0; /* Light gray for table header */
            }
            .pdf-pickup-date-highlight {
              margin-top: 5mm;
              margin-bottom: 6mm;
              font-size: 10pt;
            }
            .pdf-pickup-date-highlight .label {
              font-weight: bold;
              color: #000000;
            }
            .pdf-pickup-date-highlight .value {
              font-weight: bold;
              color: #006400; /* Dark Green for date value */
            }

            /* SIGNATURE AND DOCUMENTS */
            .pdf-signature-docs-container {
              display: flex;
              gap: 8mm; /* Gap between document and signature */
              margin-top: 6mm;
              margin-bottom: 6mm;
              align-items: flex-start; /* Align items to the top */
            }
            .pdf-doc-column { /* Generic column for doc/sig */
              text-align: center;
            }
            .pdf-signature-docs-container .pdf-doc-column:first-child { /* Document Column */
              flex-grow: 2; 
              flex-basis: 0;
              min-width: 0;
            }
            .pdf-signature-docs-container .pdf-doc-column:last-child { /* Signature Column */
              flex-grow: 1;
              flex-basis: 0;
              min-width: 0;
            }
            .pdf-column-title {
              font-size: 10pt;
              font-weight: bold;
              margin-bottom: 2mm;
              color: #000000;
            }
            .pdf-placeholder-box {
              border: 1px dashed #BBBBBB; /* Dashed border for placeholder */
              height: 55mm; /* Consistent height */
              display: flex;
              align-items: center;
              justify-content: center;
              background-color: #fdfdfd;
              padding: 2mm; /* Padding inside the box */
              box-sizing: border-box;
              overflow: hidden;
            }
            .pdf-placeholder-box img {
              max-width: 100%;
              max-height: 100%;
              object-fit: contain;
            }
            .pdf-placeholder-text {
              font-size: 8pt;
              color: #777777;
            }
            
            /* SOCIAL CONTRACT (if applicable) */
            .pdf-social-contract-section {
                margin-top: 6mm; /* Space above if it appears */
                text-align: center;
            }
             .pdf-social-contract-section .pdf-placeholder-box {
                height: 60mm; /* Slightly taller for potentially portrait docs */
             }


            /* FINAL DISCLAIMER */
            .pdf-final-disclaimer { 
              font-size: 8pt; 
              margin-top: auto; /* Pushes to bottom if flex container */
              padding-top: 4mm; 
              text-align: left;
              color: #555555;
              border-top: 1px solid #EEEEEE; /* Subtle top border */
            }
          `}
        </style>
        <div className="pdf-page-container">
          <div className="pdf-header">
            <img src="https://placehold.co/70x25.png" alt="Logo" className="pdf-logo" data-ai-hint="company logo" />
            <div className="pdf-main-title">TERMO DE AUTORIZAÇÃO PARA RETIRADA POR TERCEIROS</div>
          </div>

          <div className="pdf-data-section">
            <div className="pdf-data-section-title">DADOS DO COMPRADOR</div>
            <div className="pdf-data-content-wrapper">
              <div className="pdf-data-grid">
                <div className="pdf-data-grid-item full-width">
                  <span className="pdf-field-label">Nome/Razão Social:</span>
                  <span className="pdf-field-value">{form.getValues('buyerName') || ' '}</span>
                </div>
                {form.getValues('buyerType') === 'individual' ? (
                  <>
                    <div className="pdf-data-grid-item">
                      <span className="pdf-field-label">RG:</span>
                      <span className="pdf-field-value">{form.getValues('buyerRG') || ' '}</span>
                    </div>
                    <div className="pdf-data-grid-item">
                      <span className="pdf-field-label">CPF:</span>
                      <span className="pdf-field-value">{form.getValues('buyerCPF') || ' '}</span>
                    </div>
                  </>
                ) : (
                  <div className="pdf-data-grid-item full-width">
                    <span className="pdf-field-label">CNPJ:</span>
                    <span className="pdf-field-value">{form.getValues('buyerCNPJ') || ' '}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="pdf-data-section">
            <div className="pdf-data-section-title">DADOS DA PESSOA AUTORIZADA A RETIRAR</div>
            <div className="pdf-data-content-wrapper">
              <div className="pdf-data-grid">
                <div className="pdf-data-grid-item full-width">
                  <span className="pdf-field-label">Nome:</span>
                  <span className="pdf-field-value">{form.getValues('representativeName') || ' '}</span>
                </div>
                <div className="pdf-data-grid-item">
                  <span className="pdf-field-label">RG:</span>
                  <span className="pdf-field-value">{form.getValues('representativeRG') || ' '}</span>
                </div>
                <div className="pdf-data-grid-item">
                  <span className="pdf-field-label">CPF:</span>
                  <span className="pdf-field-value">{form.getValues('representativeCPF') || ' '}</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="pdf-text-block">
            <p>O comprador autoriza o representante identificado acima a retirar os produtos do pedido na loja escolhida no momento da compra no site.</p>
            <p><span>🔔</span> <strong style={{fontWeight: 'bold'}}>Importante:</strong> O comprador deve enviar o PDF da autorização para o WhatsApp ou e-mail da loja, garantindo que um colaborador da loja confirme o recebimento. A pessoa autorizada a retirar deve ser maior de idade.</p>
            <p>Se o comprador for uma pessoa jurídica, também é necessário apresentar uma foto ou cópia autenticada do Contrato Social ou Estatuto Social da empresa.</p>
            <p><span>⚠️</span> <strong style={{fontWeight: 'bold'}}>Atenção:</strong> A retirada deve ser feita dentro do horário de funcionamento da loja escolhida.</p>
          </div>

          <div> {/* Removed pdf-data-section for a cleaner look before table */}
            <div className="pdf-order-details-section-title">DETALHES DO PEDIDO</div>
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
                  <td>{form.getValues('purchaseDate') ? format(form.getValues('purchaseDate') as Date, 'dd/MM/yyyy', { locale: ptBR }) : ' '}</td>
                  <td>R$ {(form.getValues('purchaseValue') || '0,00').replace('.', ',')}</td>
                  <td>{form.getValues('orderNumber') || ' '}</td>
                  <td>{storeOptionsList.find(s => s.value === form.getValues('pickupStore'))?.label || form.getValues('pickupStore') || ' '}</td>
                </tr>
              </tbody>
            </table>
          </div>
          
          <div className="pdf-pickup-date-highlight">
            <span className="label">Data prevista para retirada:</span>{' '}
            <span className="value">
                {form.getValues('pickupDate') ? format(form.getValues('pickupDate') as Date, 'dd / MM / yyyy', { locale: ptBR }) : '_____ / _____ / _____'}
            </span>
          </div>
            
          <div className="pdf-signature-docs-container">
             <div className="pdf-doc-column"> {/* Documento do Comprador */}
                <div className="pdf-column-title">Documento do Comprador</div>
                <div className="pdf-placeholder-box pdf-document-image-wrapper">
                    {buyerIdPreview ? (
                        <img src={buyerIdPreview} alt="Identidade do Comprador" />
                    ) : <span className="pdf-placeholder-text">(Documento não fornecido)</span>}
                </div>
            </div>
            <div className="pdf-doc-column"> {/* Assinatura do Comprador */}
                <div className="pdf-column-title">Assinatura do Comprador</div>
                <div className="pdf-placeholder-box pdf-signature-box">
                {signaturePreview ? (
                    <img src={signaturePreview} alt="Assinatura do Comprador" />
                ) : <span className="pdf-placeholder-text">(Assinatura não fornecida)</span>}
                </div>
            </div>
          </div>
          
          {form.getValues('buyerType') === 'corporate' && (
            <div className="pdf-social-contract-section">
              <div className="pdf-column-title">Contrato Social / Estatuto Social</div>
              <div className="pdf-placeholder-box">
                {socialContractPreview ? (
                    socialContractPreview.startsWith('data:image') ? 
                        <img src={socialContractPreview} alt="Contrato Social" /> :
                        <span className="pdf-placeholder-text">Preview não disponível para PDF.</span>
                ) : <span className="pdf-placeholder-text">(Documento não fornecido)</span>}
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
