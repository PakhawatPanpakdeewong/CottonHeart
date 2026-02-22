-- Database Schema for Bitterrock Application
-- This file contains the complete database schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ChatContacts table
CREATE TABLE IF NOT EXISTS ChatContacts (
    ContactID BIGSERIAL PRIMARY KEY,
    PlatformUserID VARCHAR(255) NOT NULL UNIQUE,
    Channel VARCHAR(50) NOT NULL UNIQUE,
    LastUserMessageAt TIMESTAMP WITH TIME ZONE,
    ContactState VARCHAR(100) NOT NULL DEFAULT 'idle',
    CreatedDate TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UpdatedDate TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ChatSessions table
CREATE TABLE IF NOT EXISTS ChatSessions (
    SessionID BIGSERIAL PRIMARY KEY,
    ContactID BIGINT REFERENCES ChatContacts(ContactID) ON DELETE CASCADE UNIQUE,
    StartTime TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    EndTime TIMESTAMP WITH TIME ZONE
);

-- Articles Table
CREATE TABLE IF NOT EXISTS Articles (
    ArticleID BIGSERIAL PRIMARY KEY,
    URL TEXT NOT NULL UNIQUE,
    Title TEXT,
    Snippet TEXT,
    ImageURL TEXT,
    FirstSeenAt TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ArticleSentLog Table
CREATE TABLE IF NOT EXISTS ArticleSentLog (
    ArticleSentLogID BIGSERIAL PRIMARY KEY,
    ArticleID BIGINT REFERENCES Articles(ArticleID) ON DELETE CASCADE,
    ContactID BIGINT REFERENCES ChatContacts(ContactID) ON DELETE CASCADE,
    SentAt TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ChatMessages table
CREATE TABLE IF NOT EXISTS ChatMessages (
    MessageID BIGSERIAL PRIMARY KEY,
    SessionID BIGINT REFERENCES ChatSessions(SessionID) ON DELETE CASCADE,
    SenderType VARCHAR(50) NOT NULL CHECK (SenderType IN ('user', 'bot', 'admin')),
    MessagePayload JSONB NOT NULL,
    MessageText TEXT,
    CreatedDate TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Categories table
CREATE TABLE IF NOT EXISTS Categories (
    CategoryID SERIAL PRIMARY KEY,
    CategoryNameTH VARCHAR(20) NOT NULL UNIQUE,
    CategoryNameEN VARCHAR(20) NOT NULL UNIQUE
);

-- Sub categories table
CREATE TABLE IF NOT EXISTS SubCategories (
    SubCategoryID SERIAL PRIMARY KEY,
    CategoryID INTEGER REFERENCES Categories(CategoryID) ON DELETE CASCADE,
    SubCategoryNameTH VARCHAR(255) NOT NULL UNIQUE,
    SubCategoryNameEN VARCHAR(255) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS Brands (
    BrandID SERIAL PRIMARY KEY,
    SubCategoryID INTEGER REFERENCES SubCategories(SubCategoryID) ON DELETE CASCADE,
    BrandNameTH VARCHAR(255) NOT NULL,
    BrandNameEN VARCHAR(255) NOT NULL,
    BrandCode VARCHAR(255) NOT NULL,
    -- Allow same brand name/code in different subcategories
    UNIQUE(SubCategoryID, BrandNameTH),
    UNIQUE(SubCategoryID, BrandNameEN),
    UNIQUE(SubCategoryID, BrandCode)
);

-- Products table
CREATE TABLE IF NOT EXISTS Products (
    ProductID SERIAL PRIMARY KEY,
    BrandID INTEGER REFERENCES Brands(BrandID) ON DELETE SET NULL,
    SubCategoryID INTEGER REFERENCES SubCategories(SubCategoryID) ON DELETE SET NULL,
    ProductNameTH VARCHAR(255) NOT NULL,
    ProductNameEN VARCHAR(255) NOT NULL,
    Description TEXT,
    CreatedDate TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UpdatedDate TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ProductAssociationRules Table
CREATE TABLE IF NOT EXISTS ProductAssociationRules (
    AssociationID BIGSERIAL PRIMARY KEY,
    AntecedentProductID BIGINT REFERENCES Products(ProductID) ON DELETE CASCADE,
    ConsequentProductID BIGINT REFERENCES Products(ProductID) ON DELETE CASCADE,
    Support DECIMAL(10,5) NOT NULL CHECK (Support >= 0 AND Support <= 1),
    Confidence DECIMAL(10,5) NOT NULL CHECK (Confidence >= 0 AND Confidence <= 1),
    Lift DECIMAL(10,5) NOT NULL CHECK (Lift >= 0 AND Lift <= 1),
    LastCalculatedAt TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Attributes table
CREATE TABLE IF NOT EXISTS Attributes (
    AttributeID SERIAL PRIMARY KEY,
    AttributeNameTH VARCHAR(255) NOT NULL,
    AttributeNameEN VARCHAR(255) NOT NULL
);

-- Attribute values table
CREATE TABLE IF NOT EXISTS AttributeValues (
    AttributeValueID SERIAL PRIMARY KEY,
    AttributeID INTEGER REFERENCES Attributes(AttributeID) ON DELETE CASCADE,
    AttributeValueTH VARCHAR(255) NOT NULL,
    AttributeValueEN VARCHAR(255) NOT NULL,
    AttributeValueCode VARCHAR(255) NOT NULL,
    UNIQUE(AttributeID, AttributeValueCode)
);

-- Product variants table
-- Each variant represents a specific combination of attributes (e.g., นมตราหมีรสจืด 125ml)
-- SKU is unique and specific to each variant combination
CREATE TABLE IF NOT EXISTS ProductVariants (
    VariantID SERIAL PRIMARY KEY,
    ProductID INTEGER NOT NULL REFERENCES Products(ProductID) ON DELETE CASCADE,
    SKU VARCHAR(50) NOT NULL UNIQUE,
    Price DECIMAL(10,2) NOT NULL CHECK (Price >= 0),
    IsActive BOOLEAN DEFAULT true,
    CreatedDate TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UpdatedDate TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ProductVariantAttributes table (Junction table for ProductVariants and AttributeValues)
-- This table stores the specific attribute combination for each variant
-- Each variant can have MULTIPLE attributes (2, 3, 4, or more attributes per variant)
-- Examples: 
--   Variant 1 (SKU: BRD-MLK-PL-125-BOX): รสจืด + 125ml + กล่อง (3 attributes)
--   Variant 2 (SKU: BRD-MLK-CH-150-PACK): รสช็อกโกแลต + 150ml + ถุง (3 attributes)
--   Variant 3 (SKU: TEE-RED-M-LONG): สีแดง + ขนาด M + แขนยาว (3 attributes)
-- Each variant has a unique SKU and can have multiple attributes (one value per attribute type)
CREATE TABLE IF NOT EXISTS ProductVariantAttributes (
    ProductVariantAttributesID SERIAL PRIMARY KEY,
    VariantID INTEGER NOT NULL REFERENCES ProductVariants(VariantID) ON DELETE CASCADE,
    AttributeValueID INTEGER NOT NULL REFERENCES AttributeValues(AttributeValueID) ON DELETE CASCADE,
    CreatedDate TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UpdatedDate TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    -- Prevent duplicate attribute values for the same variant
    UNIQUE(VariantID, AttributeValueID)
);

-- Addresses table
CREATE TABLE IF NOT EXISTS Addresses (
    AddressID SERIAL PRIMARY KEY,
    AddressType VARCHAR(50) NOT NULL CHECK (AddressType IN ('billing', 'shipping')),
    AddressLine1 TEXT NOT NULL,
    AddressLine2 TEXT,
    City VARCHAR(100) NOT NULL,
    State VARCHAR(100) NOT NULL,
    ZipCode VARCHAR(10) NOT NULL,
    IsDefault BOOLEAN DEFAULT false,
    CreatedDate TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UpdatedDate TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Customers table
CREATE TABLE IF NOT EXISTS Customers (
    CustomerID SERIAL PRIMARY KEY,
    FirstName VARCHAR(100) NOT NULL,
    LastName VARCHAR(100) NOT NULL,
    Email VARCHAR(255) UNIQUE NOT NULL,
    PasswordHash VARCHAR(255) NOT NULL,
    PhoneNumber VARCHAR(20),
    Gender VARCHAR(10) CHECK (Gender IN ('male', 'female', 'other')),
    DateOfBirth DATE,
    RegistrationDate TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    LastOrderDate TIMESTAMP WITH TIME ZONE,
    IsVerified BOOLEAN DEFAULT false,
    IsActive BOOLEAN DEFAULT true
);

-- Orders table
CREATE TABLE IF NOT EXISTS Orders (
    OrderID SERIAL PRIMARY KEY,
    CustomerID INTEGER REFERENCES Customers(CustomerID) ON DELETE CASCADE,
    DiscountID INTEGER REFERENCES Discounts(DiscountID) ON DELETE SET NULL,
    OrderDate TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    TotalAmount DECIMAL(10,2) NOT NULL CHECK (TotalAmount >= 0),
    OrderStatus VARCHAR(50) DEFAULT 'pending' CHECK (OrderStatus IN ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled')),
    ShippingAddress TEXT NOT NULL,
    Notes TEXT,
    CreatedDate TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UpdatedDate TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Order items table
CREATE TABLE IF NOT EXISTS OrderItems (
    OrderItemID SERIAL PRIMARY KEY,
    OrderID INTEGER REFERENCES Orders(OrderID) ON DELETE CASCADE,
    InventoryID INTEGER REFERENCES Inventories(InventoryID) ON DELETE CASCADE,
    QuantityOrdered INTEGER NOT NULL CHECK (QuantityOrdered > 0),
    UnitPrice DECIMAL(10,2) NOT NULL CHECK (UnitPrice >= 0),
    TotalPrice DECIMAL(10,2) GENERATED ALWAYS AS (QuantityOrdered * UnitPrice) STORED
);

-- Inventory table
CREATE TABLE IF NOT EXISTS Inventories (
    InventoryID SERIAL PRIMARY KEY,
    VariantID INTEGER REFERENCES ProductVariants(VariantID) ON DELETE CASCADE,
    WarehouseID INTEGER REFERENCES Warehouses(WarehouseID) ON DELETE CASCADE,
    StockQuantity INTEGER NOT NULL CHECK (StockQuantity >= 0),
    ReservedQuantity INTEGER NOT NULL CHECK (ReservedQuantity >= 0),
    AvailableQuantity INTEGER NOT NULL CHECK (AvailableQuantity >= 0),
    ExpiredDate DATE,
    CreatedDate TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UpdatedDate TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Warehouses table
CREATE TABLE IF NOT EXISTS Warehouses (
    WarehouseID SERIAL PRIMARY KEY,
    WarehouseName VARCHAR(255) NOT NULL,
    LocationAddress TEXT NOT NULL,
    ContactPerson VARCHAR(255),
    Email VARCHAR(255)
);

-- Payments table
CREATE TABLE IF NOT EXISTS Payments (
    PaymentID SERIAL PRIMARY KEY,
    OrderID INTEGER REFERENCES Orders(OrderID) ON DELETE CASCADE,
    PaymentDate TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PaymentAmount DECIMAL(10,2) NOT NULL CHECK (PaymentAmount >= 0),
    PaymentMethod VARCHAR(50) NOT NULL CHECK (PaymentMethod IN ('credit_card', 'debit_card', 'bank_transfer', 'cash_on_delivery', 'digital_wallet')),
    TransactionID VARCHAR(255) UNIQUE,
    PaymentStatus VARCHAR(50) DEFAULT 'pending' CHECK (PaymentStatus IN ('pending', 'completed', 'failed', 'refunded')),
    TrackingNumber VARCHAR(255) UNIQUE,
    CreatedDate TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UpdatedDate TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Payment evidence table
CREATE TABLE IF NOT EXISTS PaymentEvidence (
    EvidenceID SERIAL PRIMARY KEY,
    PaymentID INTEGER REFERENCES Payments(PaymentID) ON DELETE CASCADE,
    ContactID BIGINT REFERENCES ChatContacts(ContactID) ON DELETE CASCADE,
    EvidenceType VARCHAR(50) NOT NULL CHECK (EvidenceType IN ('payment_proof', 'shipping_proof')),
    FileLocation TEXT NOT NULL,
    VerificationStatus VARCHAR(50) DEFAULT 'pending' CHECK (VerificationStatus IN ('pending', 'approved', 'rejected')),
    VerificationNotes TEXT,
    OCRDataExtracted TEXT,
    VerifiedDate TIMESTAMP WITH TIME ZONE,
    UploadedDate TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Shipping table
CREATE TABLE IF NOT EXISTS Shipments (
    ShipmentID SERIAL PRIMARY KEY,
    OrderID INTEGER REFERENCES Orders(OrderID) ON DELETE CASCADE,
    TrackingNumber VARCHAR(255) UNIQUE,
    ShippingCarrier VARCHAR(100),
    DeliveryStatus VARCHAR(50) DEFAULT 'pending' CHECK (DeliveryStatus IN ('pending', 'shipped', 'in_transit', 'delivered', 'failed')),
    ShipDate TIMESTAMP WITH TIME ZONE,
    EstimatedShipsDate TIMESTAMP WITH TIME ZONE,
    ShippingCost DECIMAL(10,2) DEFAULT 0 CHECK (ShippingCost >= 0),
    CreatedDate TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UpdatedDate TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Product reviews table
CREATE TABLE IF NOT EXISTS Reviews (
    ReviewID SERIAL PRIMARY KEY,
    ProductID INTEGER REFERENCES Products(ProductID) ON DELETE CASCADE,
    VariantID INTEGER REFERENCES ProductVariants(VariantID) ON DELETE CASCADE,
    CustomerID INTEGER REFERENCES Customers(CustomerID) ON DELETE CASCADE,
    Rating INTEGER NOT NULL CHECK (Rating >= 1 AND Rating <= 5),
    ReviewText TEXT,
    ReviewDate TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    IsApproved BOOLEAN DEFAULT false
);

-- Search history table
CREATE TABLE IF NOT EXISTS SearchHistory (
    SearchHistoryID SERIAL PRIMARY KEY,
    CustomerID INTEGER REFERENCES Customers(CustomerID) ON DELETE CASCADE,
    SearchQuery VARCHAR(500) NOT NULL,
    SearchDate TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Search results table
CREATE TABLE IF NOT EXISTS SearchResults (
    SearchResultID SERIAL PRIMARY KEY,
    SearchHistoryID INTEGER REFERENCES SearchHistory(SearchHistoryID) ON DELETE CASCADE,
    VariantID INTEGER REFERENCES ProductVariants(VariantID) ON DELETE CASCADE,
    ResultRank INTEGER NOT NULL CHECK (ResultRank > 0),
    IsClicked BOOLEAN DEFAULT false,
    ClickedDate TIMESTAMP WITH TIME ZONE
);

-- Sales summary table
CREATE TABLE IF NOT EXISTS SalesSummary (
    SalesSummaryID SERIAL PRIMARY KEY,
    OrderID INTEGER REFERENCES Orders(OrderID) ON DELETE CASCADE,
    ProductID INTEGER REFERENCES Products(ProductID) ON DELETE CASCADE,
    VariantID INTEGER REFERENCES ProductVariants(VariantID) ON DELETE CASCADE,
    SummaryDate DATE NOT NULL,
    TotalQuantitySold INTEGER DEFAULT 0 CHECK (TotalQuantitySold >= 0),
    TotalRevenue DECIMAL(10,2) DEFAULT 0 CHECK (TotalRevenue >= 0),
    LastCalculatedDate TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Discounts table
CREATE TABLE IF NOT EXISTS Discounts (
    DiscountID SERIAL PRIMARY KEY,
    DiscountCode VARCHAR(50) UNIQUE NOT NULL,
    DiscountType VARCHAR(20) NOT NULL CHECK (DiscountType IN ('percentage', 'fixed_amount')),
    DiscountValue DECIMAL(10,2) NOT NULL CHECK (DiscountValue > 0),
    MinimumOrderAmount DECIMAL(10,2) DEFAULT 0 CHECK (MinimumOrderAmount >= 0),
    MaximumDiscountAmount DECIMAL(10,2),
    StartDate TIMESTAMP WITH TIME ZONE NOT NULL,
    EndDate TIMESTAMP WITH TIME ZONE NOT NULL,
    UsageLimit INTEGER,
    UsedCount INTEGER DEFAULT 0 CHECK (UsedCount >= 0),
    IsActive BOOLEAN DEFAULT true,
    CreatedDate TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Cancellation table
CREATE TABLE IF NOT EXISTS Cancellation (
    CancellationID SERIAL PRIMARY KEY,
    OrderID INTEGER REFERENCES Orders(OrderID) ON DELETE CASCADE,
    CancellationDate TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CancellationReason TEXT,
    CancellationStatus VARCHAR(50) DEFAULT 'pending' CHECK (CancellationStatus IN ('pending', 'approved', 'rejected')),
    CreatedDate TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Users table for admin users
CREATE TABLE IF NOT EXISTS StaffUsers (
    StaffID SERIAL PRIMARY KEY,
    Username VARCHAR(100) UNIQUE NOT NULL,
    Email VARCHAR(255) UNIQUE NOT NULL,
    PasswordHash VARCHAR(255) NOT NULL,
    StaffRole VARCHAR(50) DEFAULT 'admin' CHECK (StaffRole IN ('admin', 'manager', 'staff')),
    StaffStatus VARCHAR(50) DEFAULT 'active' CHECK (StaffStatus IN ('active', 'inactive')),
    CreatedDate TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    LastLogin TIMESTAMP WITH TIME ZONE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_chat_contacts_platform_user_id ON ChatContacts(PlatformUserID);
CREATE INDEX IF NOT EXISTS idx_chat_contacts_channel ON ChatContacts(Channel);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_contact_id ON ChatSessions(ContactID);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON ChatMessages(SessionID);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender_type ON ChatMessages(SenderType);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_date ON ChatMessages(CreatedDate);
CREATE INDEX IF NOT EXISTS idx_articles_url ON Articles(URL);
CREATE INDEX IF NOT EXISTS idx_articles_first_seen_at ON Articles(FirstSeenAt);
CREATE INDEX IF NOT EXISTS idx_products_sub_category_id ON Products(SubCategoryID);
CREATE INDEX IF NOT EXISTS idx_product_variants_product_id ON ProductVariants(ProductID);
CREATE INDEX IF NOT EXISTS idx_product_variants_sku ON ProductVariants(SKU);
CREATE INDEX IF NOT EXISTS idx_product_variants_price ON ProductVariants(Price);
CREATE INDEX IF NOT EXISTS idx_attribute_values_attribute_id ON AttributeValues(AttributeID);
CREATE INDEX IF NOT EXISTS idx_product_variant_attributes_variant_id ON ProductVariantAttributes(VariantID);
CREATE INDEX IF NOT EXISTS idx_product_variant_attributes_attribute_value_id ON ProductVariantAttributes(AttributeValueID);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON Orders(CustomerID);
CREATE INDEX IF NOT EXISTS idx_orders_order_date ON Orders(OrderDate);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON OrderItems(OrderID);
CREATE INDEX IF NOT EXISTS idx_order_items_inventory_id ON OrderItems(InventoryID);
CREATE INDEX IF NOT EXISTS idx_inventory_product_id ON Inventories(ProductID);
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON Payments(OrderID);
CREATE INDEX IF NOT EXISTS idx_shipping_order_id ON Shipments(OrderID);
CREATE INDEX IF NOT EXISTS idx_product_reviews_product_id ON Reviews(ProductID);
CREATE INDEX IF NOT EXISTS idx_search_history_customer_id ON SearchHistory(CustomerID);
CREATE INDEX IF NOT EXISTS idx_sales_summary_product_id ON SalesSummary(ProductID);
CREATE INDEX IF NOT EXISTS idx_sales_summary_variant_id ON SalesSummary(VariantID);
CREATE INDEX IF NOT EXISTS idx_sales_summary_date ON SalesSummary(SummaryDate);
CREATE INDEX IF NOT EXISTS idx_discounts_discount_code ON Discounts(DiscountCode);
CREATE INDEX IF NOT EXISTS idx_discounts_discount_type ON Discounts(DiscountType);
CREATE INDEX IF NOT EXISTS idx_discounts_discount_value ON Discounts(DiscountValue);
CREATE INDEX IF NOT EXISTS idx_discounts_minimum_order_amount ON Discounts(MinimumOrderAmount);
CREATE INDEX IF NOT EXISTS idx_discounts_maximum_discount_amount ON Discounts(MaximumDiscountAmount);
CREATE INDEX IF NOT EXISTS idx_discounts_start_date ON Discounts(StartDate);
CREATE INDEX IF NOT EXISTS idx_discounts_end_date ON Discounts(EndDate);


-- Create triggers for updated_date
CREATE OR REPLACE FUNCTION update_updated_date_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.UpdatedDate = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_Categories_updated_date BEFORE UPDATE ON Categories FOR EACH ROW EXECUTE FUNCTION update_updated_date_column();
CREATE TRIGGER update_Products_updated_date BEFORE UPDATE ON Products FOR EACH ROW EXECUTE FUNCTION update_updated_date_column();
CREATE TRIGGER update_ProductVariants_updated_date BEFORE UPDATE ON ProductVariants FOR EACH ROW EXECUTE FUNCTION update_updated_date_column();
CREATE TRIGGER update_Shipments_updated_date BEFORE UPDATE ON Shipments FOR EACH ROW EXECUTE FUNCTION update_updated_date_column();
CREATE TRIGGER update_PaymentEvidence_updated_date BEFORE UPDATE ON PaymentEvidence FOR EACH ROW EXECUTE FUNCTION update_updated_date_column();
CREATE TRIGGER update_Payments_updated_date BEFORE UPDATE ON Payments FOR EACH ROW EXECUTE FUNCTION update_updated_date_column();
CREATE TRIGGER update_Orders_updated_date BEFORE UPDATE ON Orders FOR EACH ROW EXECUTE FUNCTION update_updated_date_column();
CREATE TRIGGER update_Addresses_updated_date BEFORE UPDATE ON Addresses FOR EACH ROW EXECUTE FUNCTION update_updated_date_column();
CREATE TRIGGER update_Inventories_updated_date BEFORE UPDATE ON Inventories FOR EACH ROW EXECUTE FUNCTION update_updated_date_column();
CREATE TRIGGER update_ChatContacts_updated_date BEFORE UPDATE ON ChatContacts FOR EACH ROW EXECUTE FUNCTION update_updated_date_column();
CREATE TRIGGER update_ProductVariantAttributes_updated_date BEFORE UPDATE ON ProductVariantAttributes FOR EACH ROW EXECUTE FUNCTION update_updated_date_column();
