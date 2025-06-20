
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
import { CalendarIcon, FileText, User, Users, ShoppingBag, Building } from 'lucide-react';
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
      buyerAddress: '',
      buyerCityState: '',
      representativeName: '',
      representativeRG: '',
      representativeCPF: '',
      representativeAddress: '',
      representativeCityState: '',
      purchaseValue: '',
      orderNumber: '',
      pickupStore: undefined, // Changed to undefined for Select placeholder
      buyerSignature: '',
      buyerIdDocument: null,
      socialContractDocument: null,
    },
  });

  const buyerType = form.watch('buyerType');

  useEffect(() => {
    form.resetField('buyerRG');
    form.resetField('buyerCPF');
    form.resetField('buyerCNPJ');
    form.resetField('socialContractDocument');
    setSocialContractPreview(null);
    form.clearErrors(['buyerRG', 'buyerCPF', 'buyerCNPJ', 'socialContractDocument']);
  }, [buyerType, form]);

  const generatePdf = async () => {
    const pdfContentElement = pdfTemplateRef.current;
    if (!pdfContentElement) {
      toast({ title: "Erro", description: "Template do PDF não encontrado.", variant: "destructive" });
      return;
    }

    // Temporarily display the element to render it
    pdfContentElement.style.position = 'fixed'; // Use fixed to ensure it's in viewport for rendering but out of sight
    pdfContentElement.style.left = '-99999px'; // Position off-screen
    pdfContentElement.style.top = '0px';
    pdfContentElement.style.display = 'block';
    pdfContentElement.style.width = '210mm'; // A4 width
    pdfContentElement.style.height = 'auto'; // Auto height initially
    pdfContentElement.style.backgroundColor = '#ffffff'; // Ensure background is white for canvas

    // Force repaint/reflow before capturing
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    pdfContentElement.offsetHeight;


    try {
      const canvas = await html2canvas(pdfContentElement, {
        scale: 1.5, // Reduced scale to help fit, balance with quality
        useCORS: true,
        logging: false,
        width: pdfContentElement.scrollWidth, // Use scrollWidth
        height: pdfContentElement.scrollHeight, // Use scrollHeight
        windowWidth: pdfContentElement.scrollWidth,
        windowHeight: pdfContentElement.scrollHeight,
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4'); // Portrait, mm, A4
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      // Calculate the image height to fit the PDF page width while maintaining aspect ratio
      const imgProps = pdf.getImageProperties(imgData);
      const aspectRatio = imgProps.width / imgProps.height;
      let imgRenderWidth = pdfWidth;
      let imgRenderHeight = pdfWidth / aspectRatio;

      // If the calculated height is still too much for one page, scale down width as well
      if (imgRenderHeight > pdfHeight) {
        imgRenderHeight = pdfHeight;
        imgRenderWidth = pdfHeight * aspectRatio;
      }
      
      // Center the image on the page if it's smaller than the page
      const xOffset = (pdfWidth - imgRenderWidth) / 2;
      const yOffset = (pdfHeight - imgRenderHeight) / 2;

      pdf.addImage(imgData, 'PNG', xOffset, yOffset, imgRenderWidth, imgRenderHeight);
      pdf.save('autorizacao_retirada.pdf');
      toast({ title: "Sucesso!", description: "PDF gerado e download iniciado." });

    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      toast({ title: "Erro ao gerar PDF", description: "Ocorreu um problema ao tentar gerar o documento.", variant: "destructive" });
    } finally {
       if (pdfContentElement) {
        pdfContentElement.style.display = 'none'; // Hide it again
        pdfContentElement.style.position = 'absolute'; // Reset position
        pdfContentElement.style.left = '-9999px';
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
      setBuyerIdPreview(buyerIdDataUrl);
  
      let socialContractDataUrl: string | null = null;
      if (data.socialContractDocument && data.buyerType === 'corporate') {
        socialContractDataUrl = await readFileAsDataURL(data.socialContractDocument);
      }
      setSocialContractPreview(socialContractDataUrl);
      
      setSignaturePreview(data.buyerSignature || null);
  
      // Ensure state updates are processed before generating PDF
      // Using a microtask delay
      await new Promise(resolve => setTimeout(resolve, 0)); 
      
      await generatePdf();

    } catch (error) {
      console.error("Erro no processo de submissão:", error);
      toast({ title: "Erro na submissão", description: "Falha ao processar os dados para PDF.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const getMunicipioUF = (cityStateString: string | undefined | null): { municipio: string; uf: string } => {
    if (!cityStateString) return { municipio: '', uf: '' };
    const parts = cityStateString.split('/');
    if (parts.length === 2) {
      return { municipio: parts[0].trim(), uf: parts[1].trim().toUpperCase() };
    }
    if (cityStateString.length > 2) {
      const ufCandidate = cityStateString.slice(-2).trim().toUpperCase();
      const municipioCandidate = cityStateString.slice(0, -2).trim();
      // Basic check if the last two chars look like a UF
      if (ufCandidate.length === 2 && /^[A-Z]{2}$/.test(ufCandidate) && municipioCandidate.length > 0) { 
         return { municipio: municipioCandidate, uf: ufCandidate };
      }
    }
    return { municipio: cityStateString.trim(), uf: '' }; // Default if specific parsing fails
  };


  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8 max-w-4xl">
      <Card className="shadow-xl">
        <CardHeader className="bg-primary/10">
          <CardTitle className="text-3xl font-headline text-center text-primary-foreground">
            Autorização para Retirada por Terceiro
          </CardTitle>
          <CardDescription className="text-center text-primary-foreground/80">
            Preencha os dados abaixo para gerar sua autorização.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-8">
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-headline"><User className="text-primary" /> Comprador</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormFieldItem>
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
                
                <FormInput control={form.control} name="buyerAddress" label="Endereço" placeholder="Rua Exemplo, 123, Bairro" error={form.formState.errors.buyerAddress} />
                <FormInput control={form.control} name="buyerCityState" label="Município / UF" placeholder="Cidade / ES" error={form.formState.errors.buyerCityState} />
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
                <FormInput control={form.control} name="representativeAddress" label="Endereço" placeholder="Av. Teste, 456" error={form.formState.errors.representativeAddress} />
                <FormInput control={form.control} name="representativeCityState" label="Município / UF" placeholder="Outra Cidade / RJ" error={form.formState.errors.representativeCityState} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-headline"><ShoppingBag className="text-primary" /> Detalhes da Compra e Retirada</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormDatePicker control={form.control} name="purchaseDate" label="Data da Compra" error={form.formState.errors.purchaseDate} />
                <FormInput control={form.control} name="purchaseValue" label="Valor da Compra (R$)" placeholder="199,90" type="text" inputMode='decimal' error={form.formState.errors.purchaseValue} />
                <FormInput control={form.control} name="orderNumber" label="Número do Pedido" placeholder="RIHP-0112345678" error={form.formState.errors.orderNumber} />
                
                <FormFieldItem>
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
                            description="Formatos aceitos: JPG, PNG. Tamanho máximo: 5MB."
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
                                description="Formatos aceitos: PDF, JPG, PNG. Tamanho máximo: 5MB."
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
                      label="Assinatura do Comprador"
                      onSignatureChange={(dataUrl) => field.onChange(dataUrl)}
                      signatureError={form.formState.errors.buyerSignature?.message}
                      width={typeof window !== 'undefined' ? Math.min(window.innerWidth - 80, 450) : 450} // Adjusted width
                      height={150} // Adjusted height
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

      {/* Hidden PDF Template - Adjusted for single page */}
      <div ref={pdfTemplateRef} className="hidden" style={{ fontFamily: "'PT Sans', sans-serif", color: '#333333', fontSize: '8pt', lineHeight: '1.2', width: '210mm', boxSizing: 'border-box', padding: '0', margin: '0' }}>
        <style>
          {`
            @media print { body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; } }
            .pdf-page { padding: 7mm; width: 100%; box-sizing: border-box; background-color: #ffffff; }
            .pdf-main-header { text-align: center; margin-bottom: 3mm; }
            .pdf-main-header-brand { font-family: 'Poppins', sans-serif; font-size: 14pt; font-weight: bold; color: #1e3a5f; margin-bottom: 1mm; }
            .pdf-main-header img { display: block; margin: 0 auto 2mm auto; max-width: 100px; height: auto; }
            .pdf-main-header-title { font-family: 'Poppins', sans-serif; font-size: 11pt; font-weight: bold; color: #1e3a5f; margin-top: 2mm; text-transform: uppercase; }

            .pdf-section { margin-bottom: 3mm; padding: 2mm; border: 0.5px solid #cccccc; border-radius: 2px; }
            .pdf-section-title { font-family: 'Poppins', sans-serif; font-size: 9pt; color: #A0D2EB; margin-bottom: 1.5mm; padding-bottom: 1mm; border-bottom: 0.5px solid #A0D2EB; text-transform: uppercase; }
            
            .pdf-kv-grid { display: grid; grid-template-columns: max-content 1fr max-content 1fr; gap: 0.5mm 4mm; align-items: baseline;}
            .pdf-kv-label { font-weight: bold; text-align: left; font-size: 7.5pt; color: #444444; padding-right: 1mm;}
            .pdf-kv-value { text-align: left; font-size: 8pt; word-break: break-word; }

            .pdf-text-block { margin-top: 3mm; margin-bottom: 3mm; font-size: 7.5pt; text-align: justify; }
            .pdf-text-block p { margin-bottom: 1mm; }

            .pdf-order-details-table { margin-top: 2mm; width: 100%; border-collapse: collapse; }
            .pdf-order-details-table th, .pdf-order-details-table td { border: 0.5px solid #dddddd; padding: 1mm; text-align: left; font-size: 7.5pt; word-break: break-word; }
            .pdf-order-details-table th { background-color: #f0f0f0; font-weight: bold; }


            .pdf-footer { margin-top: 3mm; font-size: 8pt; }
            .pdf-footer-item { margin-bottom: 2mm; }
            .pdf-signature-line { border-bottom: 0.5px solid #333333; width: 100%; min-height: 10px; margin-top: 0.5mm; }
            .pdf-signature-image-container { text-align: left; margin-top: 1mm; margin-bottom: 2mm; min-height: 20mm; }
            .pdf-signature-image-container img { max-width: 80mm; max-height: 20mm; border: 0.5px solid #eeeeee; }
            
            .pdf-document-image-container { text-align: center; margin-top: 2mm; }
            .pdf-document-image-container img { max-width: 90%; height: auto; max-height: 45mm; border: 0.5px solid #cccccc; padding: 1mm; }
            .pdf-document-placeholder { font-size: 7pt; color: #666666; text-align: center; padding: 5mm; border: 0.5px dashed #cccccc; }
            
            .pdf-final-note { font-size: 6.5pt; color: #555555; margin-top: 4mm; text-align: left; border-top: 0.5px solid #eeeeee; padding-top: 2mm; }
            .pdf-spacer { height: 2mm; }
          `}
        </style>
        <div className="pdf-page">
          <div className="pdf-main-header">
            <div className="pdf-main-header-brand">RI HAPPY</div>
            <img src="https://placehold.co/100x35.png" alt="Logo Ri Happy" data-ai-hint="company logo" />
            <div className="pdf-main-header-title">TERMO DE AUTORIZAÇÃO PARA RETIRADA POR TERCEIROS</div>
          </div>

          <div className="pdf-section">
            <h2 className="pdf-section-title">COMPRADOR</h2>
            <div className="pdf-kv-grid" style={{gridTemplateColumns: 'max-content 1fr max-content 1fr', gap: '0.5mm 5mm 0.5mm 2mm'}}>
              <div className="pdf-kv-label">Nome/Razão Social:</div> <div className="pdf-kv-value" style={{gridColumn: 'span 3'}}>{form.getValues('buyerName') || ''}</div>
              
              {form.getValues('buyerType') === 'individual' ? (
                <>
                  <div className="pdf-kv-label">RG:</div> <div className="pdf-kv-value">{form.getValues('buyerRG') || ''}</div>
                  <div className="pdf-kv-label">CPF:</div> <div className="pdf-kv-value">{form.getValues('buyerCPF') || ''}</div>
                </>
              ) : (
                 <>
                  <div className="pdf-kv-label">CNPJ:</div> <div className="pdf-kv-value" style={{gridColumn: 'span 3'}}>{form.getValues('buyerCNPJ') || ''}</div>
                 </>
              )}
              <div className="pdf-kv-label">Endereço:</div> <div className="pdf-kv-value" style={{gridColumn: 'span 3'}}>{form.getValues('buyerAddress') || ''}</div>
              <div className="pdf-kv-label">Município:</div> <div className="pdf-kv-value">{getMunicipioUF(form.getValues('buyerCityState')).municipio}</div>
              <div className="pdf-kv-label">UF:</div> <div className="pdf-kv-value">{getMunicipioUF(form.getValues('buyerCityState')).uf}</div>
            </div>
          </div>

          <div className="pdf-section">
            <h2 className="pdf-section-title">REPRESENTANTE</h2>
            <div className="pdf-kv-grid" style={{gridTemplateColumns: 'max-content 1fr max-content 1fr', gap: '0.5mm 5mm 0.5mm 2mm'}}>
              <div className="pdf-kv-label">Nome/Razão Social:</div> <div className="pdf-kv-value" style={{gridColumn: 'span 3'}}>{form.getValues('representativeName') || ''}</div>
              <div className="pdf-kv-label">RG:</div> <div className="pdf-kv-value">{form.getValues('representativeRG') || ''}</div>
              <div className="pdf-kv-label">CPF:</div> <div className="pdf-kv-value">{form.getValues('representativeCPF') || ''}</div>
              <div className="pdf-kv-label">Endereço:</div> <div className="pdf-kv-value" style={{gridColumn: 'span 3'}}>{form.getValues('representativeAddress') || ''}</div>
              <div className="pdf-kv-label">Município:</div> <div className="pdf-kv-value">{getMunicipioUF(form.getValues('representativeCityState')).municipio}</div>
              <div className="pdf-kv-label">UF:</div> <div className="pdf-kv-value">{getMunicipioUF(form.getValues('representativeCityState')).uf}</div>
            </div>
          </div>

          <div className="pdf-text-block">
            <p>O COMPRADOR autoriza seu REPRESENTANTE, acima identificado, a retirar os produtos listados no Pedido, cujas informações estão detalhadas no quadro abaixo, na loja física escolhida pelo COMPRADOR no momento da realização de sua compra no site.</p>
            <p>Para retirada dos produtos, o REPRESENTANTE deverá ser maior de 18 anos, estar munido de documento oficial com foto e deste termo devidamente assinado pelo COMPRADOR e uma cópia do documento de identidade oficial do COMPRADOR.</p>
            <p>Sendo o COMPRADOR pessoa jurídica, uma foto ou cópia autenticada do Contrato Social / Estatuto Social da empresa do COMPRADOR deverá ser apresentada. (*)</p>
            <p>O horário de funcionamento da loja física escolhida para retirada do pedido, deverá ser respeitado.</p>
          </div>

          <div className="pdf-section">
            <h2 className="pdf-section-title">DETALHES DO PEDIDO</h2>
            <table className="pdf-order-details-table">
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
                  <td>{form.getValues('pickupStore') || ''}</td>
                </tr>
              </tbody>
            </table>
          </div>
          
          <div className="pdf-footer">
            <div className="pdf-footer-item" style={{float: 'left', marginRight: '20mm'}}>
              Data da retirada: {form.getValues('pickupDate') ? format(form.getValues('pickupDate')!, 'dd / MM / yyyy', { locale: ptBR }) : '_____ / _____ / _____'}
            </div>
            <div className="pdf-footer-item" style={{float: 'left'}}>
              Assinatura do comprador:
              <div className="pdf-signature-image-container">
                {signaturePreview ? <img src={signaturePreview} alt="Assinatura do Comprador" /> : <div className="pdf-signature-line" style={{width: '150px', borderBottom: '0.5px solid #333'}}></div>}
              </div>
            </div>
            <div style={{clear: 'both'}}></div>
          </div>
          
          <div className="pdf-section" style={{pageBreakInside: 'avoid'}}>
            <h2 className="pdf-section-title">DOCUMENTO DE IDENTIDADE DO COMPRADOR</h2>
            <div className="pdf-document-image-container">
              {buyerIdPreview ? <img src={buyerIdPreview} alt="Identidade do Comprador" /> : <p className="pdf-document-placeholder">Documento não fornecido.</p>}
            </div>
          </div>

          {form.getValues('buyerType') === 'corporate' && form.getValues('socialContractDocument') && (
            <div className="pdf-section" style={{pageBreakInside: 'avoid'}}>
              <h2 className="pdf-section-title">CONTRATO SOCIAL / ESTATUTO SOCIAL</h2>
              <div className="pdf-document-image-container">
                {socialContractPreview ? 
                  (socialContractPreview.startsWith('data:image') ? <img src={socialContractPreview} alt="Contrato Social" /> : <p className="pdf-document-placeholder">Contrato Social (PDF) - Visualização não disponível.</p>)
                  : <p className="pdf-document-placeholder">Documento não fornecido.</p>}
              </div>
            </div>
          )}
          <div className="pdf-spacer"></div>
          <div className="pdf-final-note">
            (***) Os documentos mencionados são obrigatórios para entrega do(s) produto(s), não serão retidos em loja, após a conferência, serão devolvidos ao terceiro autorizado.
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
  name: keyof AuthorizationFormData;
  label: string;
  placeholder?: string;
  type?: string;
  inputMode?: "text" | "search" | "email" | "tel" | "url" | "none" | "numeric" | "decimal" | undefined;
  error?: { message?: string };
  className?: string;
}

const FormInput: React.FC<FormInputProps> = ({ control, name, label, placeholder, type = "text", inputMode, error, className }) => (
  <FormFieldItem className={className}>
    <Label htmlFor={name}>{label}</Label>
    <Controller
      control={control}
      name={name}
      render={({ field }) => <Input id={name} type={type} inputMode={inputMode} placeholder={placeholder} {...field} value={field.value || ''} className={error ? 'border-destructive' : ''} />}
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
