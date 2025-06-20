
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
      buyerStreet: '',
      buyerNumber: '',
      buyerComplement: '',
      buyerNeighborhood: '',
      buyerCity: '',
      buyerState: '',
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
    // Clear conditional fields when buyerType changes
    if (buyerType === 'individual') {
        form.resetField('buyerCNPJ');
        form.resetField('socialContractDocument');
        setSocialContractPreview(null);
    } else {
        form.resetField('buyerRG');
        form.resetField('buyerCPF');
    }
    // Clear errors for these fields too
    form.clearErrors(['buyerRG', 'buyerCPF', 'buyerCNPJ', 'socialContractDocument']);
  }, [buyerType, form]);

  const generatePdf = async () => {
    const pdfContentElement = pdfTemplateRef.current;
    if (!pdfContentElement) {
      toast({ title: "Erro", description: "Template do PDF não encontrado.", variant: "destructive" });
      return;
    }
    
    // Make element visible but off-screen for rendering
    pdfContentElement.style.display = 'block';
    pdfContentElement.style.position = 'fixed'; 
    pdfContentElement.style.left = '-9999px'; 
    pdfContentElement.style.top = '0px';
    pdfContentElement.style.width = '210mm'; 
    pdfContentElement.style.backgroundColor = '#ffffff';
    pdfContentElement.style.padding = '0';
    pdfContentElement.style.margin = '0';
    
    // Force reflow/repaint to ensure styles are applied
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    pdfContentElement.offsetHeight;

    try {
      const canvas = await html2canvas(pdfContentElement, {
        scale: 2, // Increased scale for better quality, adjust as needed
        useCORS: true,
        logging: false,
        width: pdfContentElement.scrollWidth,
        height: pdfContentElement.scrollHeight,
        windowWidth: pdfContentElement.scrollWidth,
        windowHeight: pdfContentElement.scrollHeight,
      });
      
      const imgData = canvas.toDataURL('image/png', 0.95); // Use PNG with slight compression
      const pdf = new jsPDF('p', 'mm', 'a4', true); // true for compress
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      // Calculate the aspect ratio of the image
      const imgProps = pdf.getImageProperties(imgData);
      const aspectRatio = imgProps.width / imgProps.height;

      let imgRenderWidth = pdfWidth;
      let imgRenderHeight = pdfWidth / aspectRatio;

      // If rendered image height is greater than PDF height, scale down by height
      if (imgRenderHeight > pdfHeight) {
        imgRenderHeight = pdfHeight;
        imgRenderWidth = pdfHeight * aspectRatio;
      }
      
      // Center the image on the PDF page
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
        // Hide the element again after rendering
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
      
      // Using a callback with setState to ensure state is updated before PDF generation
      await new Promise<void>(resolve => {
        setBuyerIdPreview(buyerIdDataUrl);
        setSocialContractPreview(socialContractDataUrl);
        setSignaturePreview(data.buyerSignature || null); // Ensure signaturePreview has the latest value
        // Wait for next tick to ensure DOM updates with previews are processed
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
            Autorização para Retirada por Terceiro
          </CardTitle>
          <CardDescription className="text-center text-primary-foreground/80">
            Preencha os dados abaixo para gerar sua autorização. Todos os campos são obrigatórios, exceto Complemento.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-8">
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-headline"><User className="text-primary" /> Comprador</CardTitle>
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
                
                <FormInput control={form.control} name="buyerStreet" label="Rua" placeholder="Rua Exemplo" error={form.formState.errors.buyerStreet} />
                <FormInput control={form.control} name="buyerNumber" label="Número" placeholder="123" error={form.formState.errors.buyerNumber} />
                <FormInput control={form.control} name="buyerComplement" label="Complemento (Opcional)" placeholder="Apto 101" error={form.formState.errors.buyerComplement} />
                <FormInput control={form.control} name="buyerNeighborhood" label="Bairro" placeholder="Centro" error={form.formState.errors.buyerNeighborhood} />
                <FormInput control={form.control} name="buyerCity" label="Município" placeholder="Cidade" error={form.formState.errors.buyerCity} />
                <FormInput control={form.control} name="buyerState" label="UF" placeholder="ES" maxLength={2} error={form.formState.errors.buyerState} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-headline"><Users className="text-primary" /> Representante (Terceiro)</CardTitle>
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

      {/* Hidden PDF Template. Keep structure and styling closely matching the provided RiHappy image. */}
      <div ref={pdfTemplateRef} className="hidden" style={{ width: '210mm', height: '297mm', boxSizing: 'border-box', backgroundColor: 'white', color: 'black', fontFamily: 'Arial, sans-serif' }}>
        <style>
          {`
            @page { 
              size: A4;
              margin: 0; /* Ensure no browser default margins */
            }
            body { 
              margin: 0; /* Ensure no browser default margins */
            }
            .pdf-page-container {
              width: 100%; /* Should be 210mm */
              height: 100%; /* Should be 297mm */
              padding: 10mm; /* Standard A4 margin */
              box-sizing: border-box;
              font-size: 8pt; /* Base font size, adjusted for compactness */
              line-height: 1.1; /* Adjusted for compactness */
              display: flex;
              flex-direction: column;
            }
            .pdf-header { text-align: center; margin-bottom: 4mm; }
            .pdf-logo { max-width: 100px; max-height: 35px; margin-bottom: 2mm; } /* Reduced logo size */
            .pdf-main-title { font-size: 10pt; font-weight: bold; margin-bottom: 4mm; text-transform: uppercase; }

            .pdf-section-title { font-size: 7pt; font-weight: bold; margin-top: 2mm; margin-bottom: 0.5mm; background-color: #E0E0E0; padding: 0.5mm 1mm; border: 0.25px solid black;}
            
            .pdf-info-table { width: 100%; border-collapse: collapse; margin-bottom: 2mm; font-size: 7pt; }
            .pdf-info-table td { border: 0.25px solid black; padding: 0.75mm 1mm; vertical-align: top; }
            .pdf-info-table td.pdf-label { width: 20%; font-weight: normal; white-space: nowrap; } /* Normal weight for labels */
            .pdf-info-table td.pdf-value { width: 30%; font-weight: normal; word-break: break-all; } /* Normal weight for values */
            .pdf-info-table td.pdf-value-full { width: 80%; }
            
            .pdf-text-block { margin: 2mm 0; font-size: 7.5pt; text-align: justify; }
            .pdf-text-block p { margin-bottom: 1mm; }
            .pdf-text-block strong { font-weight: bold; }

            .pdf-order-table { width: 100%; border-collapse: collapse; margin-bottom: 2mm; }
            .pdf-order-table th, .pdf-order-table td { border: 0.25px solid black; padding: 0.75mm; font-size: 7pt; text-align: left; vertical-align: middle; }
            .pdf-order-table th { font-weight: bold; background-color: #E0E0E0; }

            .pdf-footer-section { margin-top: 3mm; font-size: 7.5pt; }
            .pdf-signature-area { margin-top: 2mm; }
            .pdf-signature-label { margin-bottom: 0.5mm; display: block; font-size: 7pt; }
            .pdf-signature-line-container { min-height: 10mm; display:flex; align-items: center; justify-content: flex-start; }
            .pdf-signature-line { width: 70mm; height: 10mm; border: 0.25px solid #ccc; display: flex; align-items: center; justify-content: center; margin-bottom: 0.5mm; }
            .pdf-signature-line img { max-width: 100%; max-height: 100%; object-fit: contain; }
            .pdf-signature-placeholder { color: #888; font-size: 6pt; }
            
            .pdf-final-note { font-size: 6pt; text-align: left; margin-top: auto; padding-top: 2mm; } /* Pushes to bottom */
            
            .pdf-document-section { margin-top: 2mm; page-break-inside: avoid; }
            .pdf-document-title { font-size: 7pt; font-weight: bold; margin-bottom: 0.5mm; text-align: center; }
            .pdf-document-image-container { display: flex; justify-content: center; align-items: center; border: 0.25px solid #ccc; min-height: 25mm; max-height: 30mm; padding: 1mm; margin-bottom:1mm; }
            .pdf-document-image-container img { max-width: 100%; max-height: 28mm; object-fit: contain; }
            .pdf-document-placeholder { font-size: 6pt; color: #666; text-align: center; }
          `}
        </style>
        <div className="pdf-page-container">
          <div className="pdf-header">
            <img src="https://placehold.co/120x40.png" alt="RIHAPPY Logo" className="pdf-logo" data-ai-hint="brand logo" />
            <div className="pdf-main-title">TERMO DE AUTORIZAÇÃO PARA RETIRADA POR TERCEIROS</div>
          </div>

          <div className="pdf-section-title">COMPRADOR</div>
          <table className="pdf-info-table">
            <tbody>
              <tr>
                <td className="pdf-label">Nome/Razão Social:</td>
                <td className="pdf-value" colSpan={3}>{form.getValues('buyerName') || ''}</td>
              </tr>
              <tr>
                <td className="pdf-label">RG:</td>
                <td className="pdf-value">{form.getValues('buyerType') === 'individual' ? form.getValues('buyerRG') || '' : ''}</td>
                <td className="pdf-label">CPF:</td>
                <td className="pdf-value">{form.getValues('buyerType') === 'individual' ? form.getValues('buyerCPF') || '' : ''}</td>
              </tr>
              {form.getValues('buyerType') === 'corporate' && (
                 <tr>
                    <td className="pdf-label">CNPJ:</td>
                    <td className="pdf-value" colSpan={3}>{form.getValues('buyerCNPJ') || ''}</td>
                </tr>
              )}
              <tr>
                <td className="pdf-label">Endereço:</td>
                <td className="pdf-value" colSpan={3}>
                  {`${form.getValues('buyerStreet') || ''}, ${form.getValues('buyerNumber') || ''}${form.getValues('buyerComplement') ? ` - ${form.getValues('buyerComplement')}` : ''}, ${form.getValues('buyerNeighborhood') || ''}`}
                </td>
              </tr>
              <tr>
                <td className="pdf-label">Município:</td>
                <td className="pdf-value">{form.getValues('buyerCity') || ''}</td>
                <td className="pdf-label">UF:</td>
                <td className="pdf-value">{form.getValues('buyerState') || ''}</td>
              </tr>
            </tbody>
          </table>

          <div className="pdf-section-title">REPRESENTANTE</div>
          <table className="pdf-info-table">
            <tbody>
              <tr>
                <td className="pdf-label">Nome/Razão Social:</td>
                <td className="pdf-value" colSpan={3}>{form.getValues('representativeName') || ''}</td>
              </tr>
              <tr>
                <td className="pdf-label">RG:</td>
                <td className="pdf-value">{form.getValues('representativeRG') || ''}</td>
                <td className="pdf-label">CPF:</td>
                <td className="pdf-value">{form.getValues('representativeCPF') || ''}</td>
              </tr>
            </tbody>
          </table>
          
          <div className="pdf-text-block">
            <p>O <strong>COMPRADOR</strong> autoriza seu <strong>REPRESENTANTE</strong>, acima identificado, a retirar os produtos listados no Pedido, cujas informações estão detalhadas no quadro abaixo, na loja física escolhida pelo <strong>COMPRADOR</strong> no momento da realização de sua compra no site.</p>
            <p>Para retirada dos produtos, o <strong>REPRESENTANTE</strong> deverá ser maior de 18 anos, estar munido de documento oficial com foto e deste termo devidamente assinado pelo <strong>COMPRADOR</strong> e uma cópia do documento de identidade oficial do <strong>COMPRADOR</strong>. Sendo o <strong>COMPRADOR</strong> pessoa jurídica, uma foto ou cópia autenticada do Contrato Social / Estatuto Social da empresa do <strong>COMPRADOR</strong> deverá ser apresentada. (*)</p>
            <p>O horário de funcionamento da loja física escolhida para retirada do pedido, deverá ser respeitado.</p>
          </div>

          <div className="pdf-section-title">DETALHES DO PEDIDO</div>
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
                <td>{form.getValues('purchaseDate') ? format(form.getValues('purchaseDate')!, 'dd/MM/yyyy', { locale: ptBR }) : ''}</td>
                <td>R$ {form.getValues('purchaseValue') || ''}</td>
                <td>{form.getValues('orderNumber') || ''}</td>
                <td>{storeOptionsList.find(s => s.value === form.getValues('pickupStore'))?.label || form.getValues('pickupStore') || ''}</td>
              </tr>
            </tbody>
          </table>

          <div className="pdf-footer-section">
            <div>Data da retirada: {form.getValues('pickupDate') ? format(form.getValues('pickupDate')!, 'dd / MM / yyyy', { locale: ptBR }) : '_____ / _____ / _____'}</div>
            
            <div className="pdf-signature-area">
              <span className="pdf-signature-label">Assinatura do comprador:</span>
              <div className="pdf-signature-line-container">
                <div className="pdf-signature-line">
                  {signaturePreview ? <img src={signaturePreview} alt="Assinatura do Comprador" /> : <span className="pdf-signature-placeholder"></span>}
                </div>
              </div>
            </div>
          </div>
          
          <div className="pdf-document-section">
            <div className="pdf-document-title">DOCUMENTO DE IDENTIDADE DO COMPRADOR</div>
            <div className="pdf-document-image-container">
              {buyerIdPreview ? <img src={buyerIdPreview} alt="Identidade do Comprador" /> : <p className="pdf-document-placeholder">Documento não fornecido.</p>}
            </div>
          </div>

          {form.getValues('buyerType') === 'corporate' && socialContractPreview && (
            <div className="pdf-document-section">
              <div className="pdf-document-title">CONTRATO SOCIAL / ESTATUTO SOCIAL</div>
              <div className="pdf-document-image-container">
                {socialContractPreview.startsWith('data:image') ? 
                  <img src={socialContractPreview} alt="Contrato Social" /> : 
                  <p className="pdf-document-placeholder">Contrato Social (PDF) - Visualização não disponível no preview.</p>
                }
              </div>
            </div>
          )}
          
          <div className="pdf-final-note">
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
  name: keyof AuthorizationFormData | string; // Allow string for dynamic field names if necessary
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
      name={name as keyof AuthorizationFormData} // Cast to ensure type safety with schema keys
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
