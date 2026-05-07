using Microsoft.EntityFrameworkCore;
using PaymentService.Models;

namespace PaymentService;

public class PaymentDbContext(DbContextOptions<PaymentDbContext> options) : DbContext(options)
{
    public DbSet<Wallet> Wallets => Set<Wallet>();
    public DbSet<ShoppingCart> ShoppingCarts => Set<ShoppingCart>();
    public DbSet<OrderItem> OrderItems => Set<OrderItem>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Wallet>(entity =>
        {
            entity.ToTable("wallets");
            entity.HasKey(item => item.Id);
            entity.Property(item => item.TouristId).HasMaxLength(100).IsRequired();
            entity.Property(item => item.Balance).HasPrecision(18, 2);
            entity.HasIndex(item => item.TouristId).IsUnique();
        });

        modelBuilder.Entity<ShoppingCart>(entity =>
        {
            entity.ToTable("shopping_carts");
            entity.HasKey(item => item.Id);
            entity.Property(item => item.TouristId).HasMaxLength(100).IsRequired();
            entity.Property(item => item.TouristUsername).HasMaxLength(100).IsRequired();
            entity.HasIndex(item => item.TouristId).IsUnique();
            entity.HasMany(item => item.Items)
                .WithOne(item => item.ShoppingCart)
                .HasForeignKey(item => item.ShoppingCartId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<OrderItem>(entity =>
        {
            entity.ToTable("order_items");
            entity.HasKey(item => item.Id);
            entity.Property(item => item.TourId).HasMaxLength(100).IsRequired();
            entity.Property(item => item.TourName).HasMaxLength(200).IsRequired();
            entity.Property(item => item.Price).HasPrecision(10, 2);
            entity.HasIndex(item => new { item.ShoppingCartId, item.TourId }).IsUnique();
        });
    }
}
