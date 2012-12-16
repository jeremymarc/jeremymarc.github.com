$(window).ready(function() {
    $(window).on('scroll', function(e) {
        var isDark = false;
        if ($(this).scrollTop() < 100) {
            isDark = false;
            $('#bg-image').stop().animate({
                'opacity': '0.7',
            }, 300);
        } else if (!isDark) {
            isDark = true;
            $('#bg-image').stop().animate({
                'opacity': '0.3',
            }, 300);
        }
    });
});
