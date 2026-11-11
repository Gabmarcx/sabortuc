using Microsoft.EntityFrameworkCore;
using SaborTuc.Api.Models;

namespace SaborTuc.Api.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Restaurant> Restaurants => Set<Restaurant>();
    public DbSet<Product> Products => Set<Product>();
    public DbSet<Order> Orders => Set<Order>();
    public DbSet<OrderItem> OrderItems => Set<OrderItem>();
    public DbSet<OrderStatusHistory> OrderStatusHistory => Set<OrderStatusHistory>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        b.Entity<Restaurant>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasMaxLength(64);
            e.Property(x => x.Name).HasMaxLength(200).IsRequired();
            e.Property(x => x.DeliveryFee).HasPrecision(18, 2);
            e.Property(x => x.MinOrder).HasPrecision(18, 2);
            e.HasMany(x => x.Products).WithOne(p => p.Restaurant!).HasForeignKey(p => p.RestaurantId).OnDelete(DeleteBehavior.Cascade);
        });

        b.Entity<Product>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasMaxLength(64);
            e.Property(x => x.RestaurantId).HasMaxLength(64);
            e.Property(x => x.Name).HasMaxLength(250).IsRequired();
            e.Property(x => x.Price).HasPrecision(18, 2);
        });

        b.Entity<Order>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasMaxLength(32);
            e.Property(x => x.RestaurantId).HasMaxLength(64);
            e.Property(x => x.Subtotal).HasPrecision(18, 2);
            e.Property(x => x.DeliveryFee).HasPrecision(18, 2);
            e.Property(x => x.ServiceFee).HasPrecision(18, 2);
            e.Property(x => x.Discount).HasPrecision(18, 2);
            e.Property(x => x.Total).HasPrecision(18, 2);
            e.HasIndex(x => x.CustomerEmail);
            e.HasIndex(x => x.PaymentReference);
            e.HasOne(x => x.Restaurant).WithMany().HasForeignKey(x => x.RestaurantId).OnDelete(DeleteBehavior.Restrict);
            e.HasMany(x => x.Items).WithOne(i => i.Order!).HasForeignKey(i => i.OrderId).OnDelete(DeleteBehavior.Cascade);
            e.HasMany(x => x.History).WithOne(h => h.Order!).HasForeignKey(h => h.OrderId).OnDelete(DeleteBehavior.Cascade);
        });

        b.Entity<OrderItem>(e =>
        {
            e.Property(x => x.OrderId).HasMaxLength(32);
            e.Property(x => x.Price).HasPrecision(18, 2);
        });

        b.Entity<OrderStatusHistory>(e =>
        {
            e.Property(x => x.OrderId).HasMaxLength(32);
        });
    }
}
