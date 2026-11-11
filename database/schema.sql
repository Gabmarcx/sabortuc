-- Esquema de la base de datos SaborTUC (SQL Server / T-SQL).
-- Es el mismo modelo que crea Entity Framework automáticamente; sirve como referencia
-- o para crear la base a mano. Uso: crear la base "SaborTuc" y ejecutar este script y luego seed.sql.
-- (Con SQLite no hace falta: el backend crea database/sabortuc.db solo.)

CREATE TABLE Restaurants (
    Id                    NVARCHAR(64)   NOT NULL PRIMARY KEY,
    Name                  NVARCHAR(200)  NOT NULL,
    Category              NVARCHAR(MAX)  NOT NULL,
    Address               NVARCHAR(MAX)  NOT NULL,
    Neighborhood          NVARCHAR(MAX)  NOT NULL,
    Latitude              FLOAT          NOT NULL,
    Longitude             FLOAT          NOT NULL,
    Image                 NVARCHAR(MAX)  NOT NULL,
    CoverImage            NVARCHAR(MAX)  NULL,
    Rating                FLOAT          NOT NULL,
    ReviewsCount          INT            NOT NULL,
    IsOpen                BIT            NOT NULL,
    OpeningHours          NVARCHAR(MAX)  NOT NULL,
    EstimatedDeliveryTime NVARCHAR(MAX)  NOT NULL,
    DeliveryFee           DECIMAL(18,2)  NOT NULL,
    MinOrder              DECIMAL(18,2)  NOT NULL,
    PriceRange            NVARCHAR(MAX)  NOT NULL,
    Phone                 NVARCHAR(MAX)  NOT NULL,
    MenuVerifiedStatus    NVARCHAR(MAX)  NOT NULL,
    TagsJson              NVARCHAR(MAX)  NOT NULL
);

CREATE TABLE Products (
    Id           NVARCHAR(64)   NOT NULL PRIMARY KEY,
    RestaurantId NVARCHAR(64)   NOT NULL,
    Name         NVARCHAR(250)  NOT NULL,
    Description  NVARCHAR(MAX)  NOT NULL,
    Category     NVARCHAR(MAX)  NOT NULL,
    Price        DECIMAL(18,2)  NOT NULL,
    Image        NVARCHAR(MAX)  NOT NULL,
    Available    BIT            NOT NULL,
    IsPopular    BIT            NOT NULL,
    Verified     BIT            NOT NULL,
    CONSTRAINT FK_Products_Restaurants FOREIGN KEY (RestaurantId) REFERENCES Restaurants(Id) ON DELETE CASCADE
);
CREATE INDEX IX_Products_RestaurantId ON Products(RestaurantId);

CREATE TABLE Orders (
    Id                    NVARCHAR(32)   NOT NULL PRIMARY KEY,
    CustomerName          NVARCHAR(MAX)  NOT NULL,
    CustomerPhone         NVARCHAR(MAX)  NOT NULL,
    CustomerEmail         NVARCHAR(450)  NOT NULL,
    AddressAlias          NVARCHAR(MAX)  NOT NULL,
    Street                NVARCHAR(MAX)  NOT NULL,
    Number                NVARCHAR(MAX)  NOT NULL,
    Apartment             NVARCHAR(MAX)  NULL,
    Neighborhood          NVARCHAR(MAX)  NOT NULL,
    Instructions          NVARCHAR(MAX)  NULL,
    City                  NVARCHAR(MAX)  NOT NULL,
    RestaurantId          NVARCHAR(64)   NOT NULL,
    RestaurantName        NVARCHAR(MAX)  NOT NULL,
    Subtotal              DECIMAL(18,2)  NOT NULL,
    DeliveryFee           DECIMAL(18,2)  NOT NULL,
    ServiceFee            DECIMAL(18,2)  NOT NULL,
    Discount              DECIMAL(18,2)  NOT NULL,
    Total                 DECIMAL(18,2)  NOT NULL,
    PaymentMethod         NVARCHAR(MAX)  NOT NULL,
    PaymentStatus         NVARCHAR(MAX)  NOT NULL,
    PaymentReference      NVARCHAR(450)  NULL,
    PaymentUrl            NVARCHAR(MAX)  NULL,
    Status                NVARCHAR(MAX)  NOT NULL,
    CreatedAt             DATETIME2      NOT NULL,
    EstimatedDeliveryTime NVARCHAR(MAX)  NOT NULL,
    DistanceKm            FLOAT          NULL,
    RouteDurationMin      INT            NULL,
    CONSTRAINT FK_Orders_Restaurants FOREIGN KEY (RestaurantId) REFERENCES Restaurants(Id)
);
CREATE INDEX IX_Orders_CustomerEmail ON Orders(CustomerEmail);
CREATE INDEX IX_Orders_PaymentReference ON Orders(PaymentReference);
CREATE INDEX IX_Orders_RestaurantId ON Orders(RestaurantId);

CREATE TABLE OrderItems (
    Id        INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    OrderId   NVARCHAR(32)   NOT NULL,
    ProductId NVARCHAR(MAX)  NOT NULL,
    Name      NVARCHAR(MAX)  NOT NULL,
    Price     DECIMAL(18,2)  NOT NULL,
    Quantity  INT            NOT NULL,
    Notes     NVARCHAR(MAX)  NULL,
    CONSTRAINT FK_OrderItems_Orders FOREIGN KEY (OrderId) REFERENCES Orders(Id) ON DELETE CASCADE
);
CREATE INDEX IX_OrderItems_OrderId ON OrderItems(OrderId);

CREATE TABLE OrderStatusHistory (
    Id          INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    OrderId     NVARCHAR(32)   NOT NULL,
    Status      NVARCHAR(MAX)  NOT NULL,
    Timestamp   DATETIME2      NOT NULL,
    Description NVARCHAR(MAX)  NOT NULL,
    CONSTRAINT FK_OrderStatusHistory_Orders FOREIGN KEY (OrderId) REFERENCES Orders(Id) ON DELETE CASCADE
);
CREATE INDEX IX_OrderStatusHistory_OrderId ON OrderStatusHistory(OrderId);
