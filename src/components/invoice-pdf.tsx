import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from '@react-pdf/renderer';

// Define styles for the PDF
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 11,
    fontFamily: 'Helvetica',
  },
  header: {
    marginBottom: 30,
  },
  businessName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  businessInfo: {
    fontSize: 10,
    color: '#666',
    marginBottom: 2,
  },
  invoiceTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    marginTop: 20,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  column: {
    width: '48%',
  },
  label: {
    fontSize: 9,
    color: '#666',
    marginBottom: 3,
  },
  value: {
    fontSize: 11,
    marginBottom: 8,
  },
  table: {
    marginTop: 20,
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 2,
    borderBottomColor: '#000',
    paddingBottom: 5,
    marginBottom: 10,
    fontWeight: 'bold',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  col1: {
    width: '50%',
  },
  col2: {
    width: '15%',
    textAlign: 'right',
  },
  col3: {
    width: '15%',
    textAlign: 'right',
  },
  col4: {
    width: '20%',
    textAlign: 'right',
  },
  totalsContainer: {
    marginTop: 20,
    alignItems: 'flex-end',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: 200,
    marginBottom: 5,
  },
  totalLabel: {
    fontSize: 11,
  },
  totalValue: {
    fontSize: 11,
    textAlign: 'right',
  },
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: 200,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 2,
    borderTopColor: '#000',
  },
  grandTotalLabel: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  grandTotalValue: {
    fontSize: 13,
    fontWeight: 'bold',
    textAlign: 'right',
  },
  notes: {
    marginTop: 30,
    padding: 15,
    backgroundColor: '#f9f9f9',
    borderRadius: 4,
  },
  notesTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  notesText: {
    fontSize: 10,
    color: '#333',
    lineHeight: 1.5,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    fontSize: 9,
    color: '#666',
    textAlign: 'center',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingTop: 10,
  },
});

interface InvoiceLineItem {
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

interface InvoicePDFProps {
  invoice: {
    invoiceNumber: string;
    issueDate: string;
    dueDate: string;
    status: string;
    lineItems: InvoiceLineItem[];
    subtotal: number;
    tax: number;
    total: number;
    notes?: string;
    terms?: string;
    client: {
      name: string;
      email?: string;
      phone?: string;
    };
    user: {
      name?: string;
      email?: string;
      phone?: string;
      businessName?: string;
    };
    booking?: {
      address: {
        street: string;
        city: string;
        state: string;
        zip: string;
      };
    };
  };
}

export const InvoicePDF: React.FC<InvoicePDFProps> = ({ invoice }) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatCurrency = (amount: number) => {
    return `$${amount.toFixed(2)}`;
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header with Business Info */}
        <View style={styles.header}>
          <Text style={styles.businessName}>
            {invoice.user.businessName || invoice.user.name || 'Your Business'}
          </Text>
          {invoice.user.email && (
            <Text style={styles.businessInfo}>{invoice.user.email}</Text>
          )}
          {invoice.user.phone && (
            <Text style={styles.businessInfo}>{invoice.user.phone}</Text>
          )}
        </View>

        {/* Invoice Title */}
        <Text style={styles.invoiceTitle}>INVOICE</Text>

        {/* Invoice and Client Info */}
        <View style={styles.row}>
          <View style={styles.column}>
            <Text style={styles.label}>BILL TO:</Text>
            <Text style={styles.value}>{invoice.client.name}</Text>
            {invoice.client.email && (
              <Text style={styles.businessInfo}>{invoice.client.email}</Text>
            )}
            {invoice.client.phone && (
              <Text style={styles.businessInfo}>{invoice.client.phone}</Text>
            )}
            {invoice.booking?.address && (
              <View style={{ marginTop: 10 }}>
                <Text style={styles.businessInfo}>
                  {invoice.booking.address.street}
                </Text>
                <Text style={styles.businessInfo}>
                  {invoice.booking.address.city}, {invoice.booking.address.state}{' '}
                  {invoice.booking.address.zip}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.column}>
            <View style={{ marginBottom: 10 }}>
              <Text style={styles.label}>INVOICE NUMBER:</Text>
              <Text style={styles.value}>{invoice.invoiceNumber}</Text>
            </View>
            <View style={{ marginBottom: 10 }}>
              <Text style={styles.label}>ISSUE DATE:</Text>
              <Text style={styles.value}>{formatDate(invoice.issueDate)}</Text>
            </View>
            <View style={{ marginBottom: 10 }}>
              <Text style={styles.label}>DUE DATE:</Text>
              <Text style={styles.value}>{formatDate(invoice.dueDate)}</Text>
            </View>
            <View>
              <Text style={styles.label}>STATUS:</Text>
              <Text style={styles.value}>{invoice.status}</Text>
            </View>
          </View>
        </View>

        {/* Line Items Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.col1}>DESCRIPTION</Text>
            <Text style={styles.col2}>QTY</Text>
            <Text style={styles.col3}>RATE</Text>
            <Text style={styles.col4}>AMOUNT</Text>
          </View>

          {invoice.lineItems.map((item: InvoiceLineItem, index: number) => (
            <View key={index} style={styles.tableRow}>
              <Text style={styles.col1}>{item.description}</Text>
              <Text style={styles.col2}>{item.quantity}</Text>
              <Text style={styles.col3}>{formatCurrency(item.rate)}</Text>
              <Text style={styles.col4}>{formatCurrency(item.amount)}</Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={styles.totalsContainer}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal:</Text>
            <Text style={styles.totalValue}>{formatCurrency(invoice.subtotal)}</Text>
          </View>
          {invoice.tax > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Tax:</Text>
              <Text style={styles.totalValue}>{formatCurrency(invoice.tax)}</Text>
            </View>
          )}
          <View style={styles.grandTotalRow}>
            <Text style={styles.grandTotalLabel}>Total:</Text>
            <Text style={styles.grandTotalValue}>
              {formatCurrency(invoice.total)}
            </Text>
          </View>
        </View>

        {/* Notes */}
        {invoice.notes && (
          <View style={styles.notes}>
            <Text style={styles.notesTitle}>Notes:</Text>
            <Text style={styles.notesText}>{invoice.notes}</Text>
          </View>
        )}

        {/* Footer with Terms */}
        <View style={styles.footer}>
          <Text>{invoice.terms || 'Payment due within 30 days'}</Text>
          <Text style={{ marginTop: 5 }}>
            Thank you for your business!
          </Text>
        </View>
      </Page>
    </Document>
  );
};
