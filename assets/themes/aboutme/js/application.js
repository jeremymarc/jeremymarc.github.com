$(window).ready(function() {
    $(document).on('click', '.social.email', function(e) {
        var a = ['c', 'm', 'a', 'e', '.', 'o', 'm', 'j', 'r', 'c', '@'];
        var e = a[7] + a[3] + a[8] + a[3] + a[1] + "y" + a[4] + a[1] + a[2] + a[8] + a[9]  + a[10] + a[1] + a[3] + a[4] + "com";
        document.location = "mailto:" + e;
        return false;
    });
});
